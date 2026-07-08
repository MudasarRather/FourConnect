<template>
  <div class="cw">
    <!-- column headers -->
    <div class="cw-head">
      <span class="cw-gutter"></span>
      <button
        v-for="d in days" :key="d.key" class="cw-col-head" :class="{ today: d.isToday }"
        @click="$emit('peek', d, $event.currentTarget)"
      >
        <span class="cw-dow sd-mono">{{ d.dow.toUpperCase() }}</span>
        <b class="cw-num">{{ d.dayNum }}</b>
        <span v-if="d.holiday" class="cw-hol" :title="d.holiday"><Sparkles :size="10" /></span>
      </button>
    </div>

    <div class="cw-body" :style="{ '--h0': H0, '--h1': H1 }">
      <!-- hour gutter -->
      <div class="cw-gutter cw-hours sd-mono">
        <span v-for="h in hours" :key="h" class="cw-hour" :style="{ top: hourTop(h) + '%' }">{{ hh(h) }}</span>
      </div>

      <!-- day lanes -->
      <div
        v-for="(d, di) in days" :key="d.key" class="cw-lane"
        :class="{ today: d.isToday, offday: !d.isBusiness, holiday: !!d.holiday }"
        :style="{ '--i': di }"
      >
        <i v-if="d.isBusiness && band" class="cw-band" :style="band" aria-hidden="true"></i>
        <i v-for="h in hours" :key="h" class="cw-line" :style="{ top: hourTop(h) + '%' }" aria-hidden="true"></i>
        <i v-if="d.isToday && nowTop != null" class="cw-nowline" :style="{ top: nowTop + '%' }" aria-hidden="true"></i>

        <button
          v-for="(ev, k) in d.events" :key="ev.kind + '-' + ev.id"
          class="cw-ev" :class="[`tk-${tokenOf(ev)}`, { brc: ev.is_breached }]"
          :style="evStyle(ev, k)"
          :title="`${ev.ticket_number || ''} · ${labelOf(ev)} · ${ev.subject || ''} · ${fmtTime(ev.at)}`"
          @click="$emit('open', ev)"
        >
          <i class="cw-dot"></i>
          <span class="cw-ev-txt sd-mono">{{ ev.ticket_number || labelOf(ev) }}</span>
          <span class="cw-ev-time sd-mono">{{ fmtTime(ev.at) }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Sparkles } from 'lucide-vue-next'
import { calKindMeta } from '@/composables/useSupportDesk'
import { fmtTime, hourOf } from '../chrono'

const props = defineProps({
  /** 7 × {key, dayNum, dow, isToday, isBusiness, holiday, events[]} */
  days: { type: Array, default: () => [] },
  /** CalendarBusiness | null */
  business: { type: Object, default: null },
})
defineEmits(['open', 'peek'])

const H0 = 6, H1 = 23          // visible window: 06:00 → 23:00
const hours = Array.from({ length: H1 - H0 + 1 }, (_, i) => H0 + i)
const hh = (h) => String(h).padStart(2, '0')

const span = H1 - H0
const hourTop = (h) => ((h - H0) / span) * 100
const clampTop = (v) => Math.min(97, Math.max(0.5, v))

const tokenOf = (ev) => calKindMeta(ev.kind).token
const labelOf = (ev) => calKindMeta(ev.kind).short

const evStyle = (ev, k) => ({
  top: clampTop(((hourOf(ev.at) - H0) / span) * 100) + '%',
  animationDelay: (k % 8) * 0.05 + 's',
})

const nowTop = computed(() => {
  const h = new Date()
  const v = h.getHours() + h.getMinutes() / 60
  if (v < H0 || v > H1) return null
  return ((v - H0) / span) * 100
})

const band = computed(() => {
  const b = props.business
  if (!b || !b.start || !b.end) return null
  const p = (s) => { const [x, y] = String(s).split(':').map(Number); return x + (y || 0) / 60 }
  const s = Math.max(H0, p(b.start)), e = Math.min(H1, p(b.end))
  if (e <= s) return null
  return { top: hourTop(s) + '%', height: ((e - s) / span) * 100 + '%' }
})
</script>

<style scoped>
.cw { display: flex; flex-direction: column; gap: 6px; }
.cw-head { display: grid; grid-template-columns: 46px repeat(7, 1fr); gap: 6px; }
.cw-col-head {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 8px 6px; border-radius: 12px; cursor: pointer;
  background: var(--sd-surface); border: 1px solid var(--sd-border);
  transition: border-color 0.2s;
}
.cw-col-head:hover { border-color: var(--sd-cal-brd); }
.cw-col-head.today { border-color: var(--sd-cal-core); background: var(--sd-cal-soft); }
.cw-dow { font-size: 8.5px; font-weight: 700; letter-spacing: 0.22em; color: var(--sd-text-dim); }
.cw-num { font-size: 15px; font-weight: 800; color: var(--sd-text); }
.cw-col-head.today .cw-num { color: var(--sd-cal-core); }
.cw-hol { color: var(--sd-cal-resume); display: inline-flex; }

.cw-body {
  position: relative; display: grid; grid-template-columns: 46px repeat(7, 1fr); gap: 6px;
  height: 560px;
}
.cw-hours { position: relative; }
.cw-hour {
  position: absolute; right: 8px; transform: translateY(-50%);
  font-size: 8.5px; letter-spacing: 0.14em; color: var(--sd-text-dim);
}
.cw-lane {
  position: relative; overflow: hidden; border-radius: 12px;
  background: var(--sd-surface); border: 1px solid var(--sd-border);
  animation: sd-cal-rise 0.45s var(--sd-spring) both; animation-delay: calc(var(--i) * 0.05s);
}
.cw-lane.offday { background-image: repeating-linear-gradient(135deg, var(--sd-cal-moon-soft) 0 1px, transparent 1px 10px); }
.cw-lane.holiday { background-color: var(--sd-cal-holiday); }
.cw-lane.today { border-color: var(--sd-cal-brd); }
.cw-band { position: absolute; left: 0; right: 0; background: var(--sd-cal-band); pointer-events: none; }
.cw-line { position: absolute; left: 0; right: 0; height: 1px; background: var(--sd-border); opacity: 0.5; pointer-events: none; }
.cw-nowline {
  position: absolute; left: 0; right: 0; height: 2px; z-index: 3;
  background: linear-gradient(90deg, var(--sd-cal-core), transparent);
  box-shadow: 0 0 12px var(--sd-cal-core); pointer-events: none;
}
.cw-nowline::before {
  content: ""; position: absolute; left: -1px; top: -3px; width: 8px; height: 8px;
  border-radius: 50%; background: var(--sd-cal-core); box-shadow: 0 0 10px var(--sd-cal-core);
}

.cw-ev {
  --tk: var(--sd-cal-core);
  position: absolute; left: 5px; right: 5px; z-index: 2;
  display: flex; align-items: center; gap: 5px; min-width: 0;
  padding: 3px 7px; border-radius: 8px; cursor: pointer;
  background: color-mix(in srgb, var(--tk) 14%, var(--sd-surface-elevated));
  border: 1px solid color-mix(in srgb, var(--tk) 30%, transparent);
  animation: sd-cal-pop 0.35s var(--sd-spring) both;
  transition: transform 0.16s var(--sd-spring), z-index 0s;
}
.cw-ev:hover { transform: scale(1.04); z-index: 5; }
.cw-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--tk); box-shadow: 0 0 7px var(--tk); flex: none; }
.cw-ev-txt { flex: 1; min-width: 0; font-size: 9px; font-weight: 700; color: var(--sd-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cw-ev-time { font-size: 8px; color: var(--sd-text-dim); flex: none; }
.cw-ev.brc { --tk: var(--sd-cal-storm); animation: sd-cal-pop 0.35s var(--sd-spring) both, sd-cal-storm-pulse 2.4s ease-in-out infinite; }

.tk-core { --tk: var(--sd-cal-core); } .tk-ember { --tk: var(--sd-cal-ember); }
.tk-rose { --tk: var(--sd-cal-rose); } .tk-gold { --tk: var(--sd-cal-gold); }
.tk-resume { --tk: var(--sd-cal-resume); } .tk-stone { --tk: var(--sd-cal-stone); }
.tk-moon { --tk: var(--sd-cal-moon); } .tk-pin { --tk: var(--sd-cal-pin); }

.cw-gutter { min-width: 0; }
@media (max-width: 900px) { .cw-ev-time { display: none; } .cw-body { height: 480px; } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .cw-lane,
  html:not([data-cinematic="on"]) .cw-ev { animation: none; }
}
</style>
