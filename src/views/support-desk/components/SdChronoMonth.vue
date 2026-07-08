<template>
  <div class="cm">
    <div class="cm-dow sd-mono">
      <span v-for="d in DOW" :key="d">{{ d.toUpperCase() }}</span>
    </div>

    <div class="cm-grid">
      <button
        v-for="(c, i) in cells" :key="c.key"
        class="cm-cell"
        :class="{
          out: !c.inMonth, today: c.isToday, holiday: !!c.holiday,
          offday: !c.isBusiness, overloaded: c.overloaded, hasload: c.load > 0,
        }"
        :style="{ '--i': i % 14, '--heat': heat(c) }"
        @click="$emit('peek', c, $event.currentTarget)"
      >
        <span class="cm-storm" v-if="c.breach > 0" aria-hidden="true"></span>

        <span class="cm-head">
          <b class="cm-num">{{ c.dayNum }}</b>
          <span v-if="c.isToday" class="cm-now sd-mono">TODAY</span>
          <span v-else-if="c.holiday" class="cm-hol" :title="c.holiday"><Sparkles :size="10" /></span>
        </span>

        <span v-if="c.holiday" class="cm-hol-name">{{ c.holiday }}</span>

        <span class="cm-evs">
          <span
            v-for="ev in c.events.slice(0, maxChips)" :key="ev.kind + '-' + ev.id"
            class="cm-ev" :class="[`tk-${tokenOf(ev)}`, { brc: ev.is_breached }]"
            :title="`${ev.ticket_number || ''} · ${labelOf(ev)} · ${ev.subject || ''}`"
            @click.stop="$emit('open', ev)"
          >
            <i class="cm-dot"></i>
            <span class="cm-ev-txt sd-mono">{{ ev.ticket_number || labelOf(ev) }}</span>
            <span class="cm-ev-time sd-mono">{{ fmtTime(ev.at) }}</span>
          </span>
          <span v-if="c.events.length > maxChips" class="cm-more sd-mono">
            +{{ c.events.length - maxChips }} more
          </span>
        </span>

        <i class="cm-loadbar" aria-hidden="true"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
import { Sparkles } from 'lucide-vue-next'
import { calKindMeta } from '@/composables/useSupportDesk'
import { DOW, fmtTime } from '../chrono'

defineProps({
  /** [{key, dayNum, inMonth, isToday, events, load, breach, holiday, isBusiness, overloaded}] */
  cells: { type: Array, default: () => [] },
  maxChips: { type: Number, default: 3 },
})
defineEmits(['peek', 'open'])

const tokenOf = (ev) => calKindMeta(ev.kind).token
const labelOf = (ev) => calKindMeta(ev.kind).short
const heat = (c) => Math.min(1, (c.load || 0) / 6)
</script>

<style scoped>
.cm { display: flex; flex-direction: column; gap: 8px; }

.cm-dow {
  display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; padding: 0 2px;
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.22em; color: var(--sd-text-dim);
}
.cm-dow span { text-align: left; padding-left: 12px; }

.cm-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }

.cm-cell {
  --heat: 0;
  position: relative; overflow: hidden; text-align: left; cursor: pointer;
  display: flex; flex-direction: column; gap: 5px;
  min-height: 104px; padding: 9px 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--sd-border);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--sd-cal-core) calc(var(--heat) * 9%), transparent), transparent 70%),
    var(--sd-surface);
  animation: sd-cal-rise 0.45s var(--sd-spring) both;
  animation-delay: calc(var(--i) * 0.022s);
  transition: transform 0.22s var(--sd-spring), border-color 0.22s, box-shadow 0.22s;
}
.cm-cell:hover { transform: translateY(-2px); border-color: var(--sd-cal-brd); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25); z-index: 2; }
.cm-cell.out { opacity: 0.45; }
.cm-cell.offday { background-image: linear-gradient(180deg, transparent, transparent), repeating-linear-gradient(135deg, var(--sd-cal-moon-soft) 0 1px, transparent 1px 9px); }
.cm-cell.holiday { background-color: var(--sd-cal-holiday); }
.cm-cell.today { border-color: var(--sd-cal-core); animation: sd-cal-rise 0.45s var(--sd-spring) both, sd-cal-now 3.4s ease-in-out infinite; }

/* overload warning stripes — the ServiceNow-style conflict signal */
.cm-cell.overloaded::after {
  content: ""; position: absolute; inset: 0 0 auto 0; height: 4px;
  background: repeating-linear-gradient(135deg, var(--sd-cal-storm) 0 6px, transparent 6px 12px);
  opacity: 0.85;
}

.cm-storm {
  position: absolute; top: 7px; right: 7px; width: 8px; height: 8px; border-radius: 50%;
  background: var(--sd-cal-storm);
  animation: sd-cal-storm-pulse 2.2s ease-in-out infinite;
}

.cm-head { display: flex; align-items: center; gap: 7px; }
.cm-num { font-size: 13.5px; font-weight: 800; color: var(--sd-text); font-variant-numeric: tabular-nums; }
.cm-cell.out .cm-num { color: var(--sd-text-dim); }
.cm-now {
  font-size: 7.5px; font-weight: 700; letter-spacing: 0.24em; color: var(--sd-cal-core);
  border: 1px solid var(--sd-cal-brd); border-radius: 999px; padding: 2px 6px;
  background: var(--sd-cal-soft);
}
.cm-hol { color: var(--sd-cal-resume); display: inline-flex; }
.cm-hol-name {
  font-size: 8.5px; font-weight: 600; letter-spacing: 0.04em; color: var(--sd-cal-resume);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.cm-evs { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.cm-ev {
  --tk: var(--sd-cal-core);
  display: flex; align-items: center; gap: 5px; min-width: 0;
  padding: 2.5px 6px; border-radius: 7px; cursor: pointer;
  background: color-mix(in srgb, var(--tk) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--tk) 22%, transparent);
  transition: transform 0.16s var(--sd-spring), background 0.16s;
}
.cm-ev:hover { transform: translateX(2px); background: color-mix(in srgb, var(--tk) 18%, transparent); }
.cm-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--tk); box-shadow: 0 0 7px var(--tk); flex: none; animation: sd-cal-pop 0.4s var(--sd-spring) both; }
.cm-ev-txt { flex: 1; min-width: 0; font-size: 9px; font-weight: 600; color: var(--sd-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cm-ev-time { font-size: 8px; color: var(--sd-text-dim); flex: none; }
.cm-ev.brc { --tk: var(--sd-cal-storm); }
.cm-ev.brc .cm-ev-txt { color: var(--sd-cal-storm); font-weight: 700; }

.cm-more { font-size: 8.5px; font-weight: 700; letter-spacing: 0.1em; color: var(--sd-cal-core); padding-left: 2px; }

.cm-loadbar {
  position: absolute; left: 10px; right: 10px; bottom: 5px; height: 3px; border-radius: 2px;
  background: var(--sd-border);
  overflow: hidden;
}
.cm-loadbar::after {
  content: ""; position: absolute; inset: 0;
  transform-origin: left; transform: scaleX(var(--heat));
  background: linear-gradient(90deg, var(--sd-cal-core), var(--sd-cal-ember));
  transition: transform 0.6s var(--sd-spring);
}

.tk-core { --tk: var(--sd-cal-core); } .tk-ember { --tk: var(--sd-cal-ember); }
.tk-rose { --tk: var(--sd-cal-rose); } .tk-gold { --tk: var(--sd-cal-gold); }
.tk-resume { --tk: var(--sd-cal-resume); } .tk-stone { --tk: var(--sd-cal-stone); }
.tk-moon { --tk: var(--sd-cal-moon); } .tk-pin { --tk: var(--sd-cal-pin); }

@media (max-width: 900px) {
  .cm-grid { gap: 5px; } .cm-cell { min-height: 84px; padding: 7px; }
  .cm-ev-time { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .cm-cell,
  html:not([data-cinematic="on"]) .cm-storm,
  html:not([data-cinematic="on"]) .cm-dot { animation: none; }
}
</style>
