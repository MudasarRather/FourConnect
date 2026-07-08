<template>
  <!-- Teleported + position:fixed from the anchor rect (the repo's stacking-context
       escape hatch); @mousedown.stop keeps outside-click closers from eating clicks. -->
  <Teleport to="body">
    <Presence>
      <Motion
        v-if="open"
        ref="popRef"
        class="cp" :style="posStyle"
        :initial="{ opacity: 0, y: 10, scale: 0.97 }"
        :animate="{ opacity: 1, y: 0, scale: 1 }"
        :exit="{ opacity: 0, y: 8, scale: 0.985 }"
        :transition="{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }"
        @mousedown.stop @click.stop
      >
        <header class="cp-head">
          <div>
            <p class="cp-eyebrow sd-mono">CHRONO · DAY</p>
            <h3 class="cp-title">{{ title }}</h3>
            <p v-if="holiday" class="cp-holiday"><Sparkles :size="11" /> {{ holiday }}</p>
          </div>
          <button class="cp-x" aria-label="Close" @click="$emit('close')"><X :size="15" /></button>
        </header>

        <p v-if="overloaded" class="cp-warn sd-mono">
          <TriangleAlert :size="12" /> OVERLOADED DAY — CONSIDER {{ nextOpenLabel || 'A QUIETER WINDOW' }}
        </p>

        <div class="cp-body sd-scroll">
          <p v-if="!events.length" class="cp-empty sd-mono">NOTHING ON THIS DAY.</p>
          <section v-for="g in grouped" :key="g.kind" class="cp-group">
            <p class="cp-kind sd-mono" :class="`tk-${g.token}`"><i class="cp-kdot"></i>{{ g.label }} · {{ g.events.length }}</p>
            <button
              v-for="ev in g.events" :key="ev.kind + '-' + ev.id"
              class="cp-row" :class="{ brc: ev.is_breached }"
              @click="$emit('open-ticket', ev)"
            >
              <span class="cp-time sd-mono">{{ fmtTime(ev.at) }}</span>
              <b class="cp-num sd-mono">{{ ev.ticket_number || 'PIN' }}</b>
              <span class="cp-sub">{{ ev.subject || ev.note || '—' }}</span>
              <span v-if="ev.is_breached" class="cp-brc sd-mono">LATE</span>
            </button>
          </section>
        </div>

        <footer class="cp-foot">
          <button class="cp-act" @click="$emit('remind')"><BellPlus :size="13" /> Remind me</button>
          <button class="cp-act pins" @click="$emit('pins')"><BellRing :size="13" /> Pin rack</button>
          <button class="cp-act" @click="$emit('day-view')"><CalendarSearch :size="13" /> Day view</button>
        </footer>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, nextTick, ref, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { X, Sparkles, TriangleAlert, BellPlus, BellRing, CalendarSearch } from 'lucide-vue-next'
import { calKindMeta } from '@/composables/useSupportDesk'
import { fmtTime } from '../chrono'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  holiday: { type: String, default: '' },
  overloaded: { type: Boolean, default: false },
  nextOpenLabel: { type: String, default: '' },
  events: { type: Array, default: () => [] },
  /** the trigger element to anchor to */
  anchor: { type: Object, default: null },
})
const emit = defineEmits(['close', 'open-ticket', 'remind', 'day-view', 'pins'])

const pos = ref({ top: 100, left: 100 })
const popRef = ref(null)
const W = 360

const recalc = () => {
  const el = props.anchor
  if (!el || !el.getBoundingClientRect) return
  const r = el.getBoundingClientRect()
  // Measure the REAL rendered height once the popover exists — a fixed estimate made
  // short peeks flip above the anchor and clamp to the viewport top, far from the cell.
  const popEl = popRef.value?.$el ?? popRef.value
  const H = popEl?.offsetHeight || 420
  let left = r.left + r.width / 2 - W / 2
  left = Math.max(12, Math.min(left, window.innerWidth - W - 12))
  let top = r.bottom + 8
  if (top + H > window.innerHeight - 12) top = r.top - H - 8          // flip above
  if (top < 12) {                                                     // neither side fits — hug the anchor inside the viewport
    top = Math.min(Math.max(12, r.top + r.height / 2 - H / 2), window.innerHeight - H - 12)
  }
  pos.value = { top, left }
}
// Recalc when opened/re-anchored, then AGAIN next tick with the measured height
// (also covers content-size changes between two peeks).
watch(() => [props.open, props.anchor, props.events], () => {
  if (props.open) { recalc(); nextTick(recalc) }
})
const onWin = () => { if (props.open) recalc() }
const onEsc = (e) => { if (e.key === 'Escape' && props.open) emit('close') }
const onDoc = () => { if (props.open) emit('close') }
onMounted(() => {
  window.addEventListener('resize', onWin)
  window.addEventListener('scroll', onWin, { capture: true })
  window.addEventListener('keydown', onEsc)
  document.addEventListener('mousedown', onDoc)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onWin)
  window.removeEventListener('scroll', onWin, { capture: true })
  window.removeEventListener('keydown', onEsc)
  document.removeEventListener('mousedown', onDoc)
})

const posStyle = computed(() => ({ top: pos.value.top + 'px', left: pos.value.left + 'px' }))

const grouped = computed(() => {
  const by = new Map()
  for (const ev of props.events) {
    if (!by.has(ev.kind)) by.set(ev.kind, [])
    by.get(ev.kind).push(ev)
  }
  return [...by.entries()].map(([kind, events]) => {
    const m = calKindMeta(kind)
    return { kind, label: m.label, token: m.token, events }
  })
})
</script>

<style scoped>
.cp {
  position: fixed; z-index: 2400; width: 360px; max-height: min(440px, calc(100vh - 24px));
  display: flex; flex-direction: column;
  border-radius: 18px; overflow: hidden;
  background: var(--sd-surface-elevated);
  border: 1px solid var(--sd-cal-brd);
  box-shadow: var(--sd-shadow-hover), var(--sd-cal-glow);
}
.cp::before { content: ""; position: absolute; inset: 0 0 auto 0; height: 3px; background: var(--sd-cal-grad); }

.cp-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; padding: 14px 16px 10px; border-bottom: 1px solid var(--sd-border); }
.cp-eyebrow { margin: 0 0 4px; font-size: 8.5px; font-weight: 700; letter-spacing: 0.26em; color: var(--sd-cal-core); }
.cp-title { margin: 0; font-size: 15px; font-weight: 800; color: var(--sd-text); letter-spacing: -0.01em; }
.cp-holiday { margin: 4px 0 0; display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--sd-cal-resume); }
.cp-x {
  flex: none; width: 28px; height: 28px; display: grid; place-items: center; cursor: pointer;
  border-radius: 9px; background: transparent; border: 1px solid var(--sd-border); color: var(--sd-text-muted);
}
.cp-x:hover { color: var(--sd-text); border-color: var(--sd-border-strong); }

.cp-warn {
  display: flex; align-items: center; gap: 7px; margin: 0; padding: 8px 16px;
  font-size: 8.5px; font-weight: 700; letter-spacing: 0.14em; color: var(--sd-cal-storm);
  background: var(--sd-cal-storm-soft); border-bottom: 1px solid var(--sd-border);
}

.cp-body { flex: 1; overflow-y: auto; padding: 12px 16px; display: flex; flex-direction: column; gap: 13px; }
.cp-empty { padding: 30px 0; text-align: center; font-size: 9.5px; letter-spacing: 0.3em; color: var(--sd-text-dim); }
.cp-group { display: flex; flex-direction: column; gap: 5px; }
.cp-kind { --tk: var(--sd-cal-core); display: flex; align-items: center; gap: 7px; margin: 0; font-size: 9px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--tk); }
.cp-kdot { width: 7px; height: 7px; border-radius: 50%; background: var(--tk); box-shadow: 0 0 7px var(--tk); }
.cp-row {
  display: flex; align-items: center; gap: 9px; min-width: 0; text-align: left; cursor: pointer;
  padding: 7px 10px; border-radius: 10px;
  background: var(--sd-surface); border: 1px solid var(--sd-border);
  transition: transform 0.16s var(--sd-spring), border-color 0.16s;
}
.cp-row:hover { transform: translateX(3px); border-color: var(--sd-cal-brd); }
.cp-time { flex: none; font-size: 9.5px; font-weight: 700; color: var(--sd-text-muted); }
.cp-num { flex: none; font-size: 10.5px; font-weight: 700; color: var(--sd-text); }
.cp-sub { flex: 1; min-width: 0; font-size: 11px; color: var(--sd-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cp-brc { flex: none; font-size: 7.5px; font-weight: 700; letter-spacing: 0.18em; color: var(--sd-cal-storm); border: 1px solid var(--sd-cal-storm); border-radius: 999px; padding: 1px 6px; }
.cp-row.brc { border-color: color-mix(in srgb, var(--sd-cal-storm) 32%, transparent); }

.cp-foot { display: flex; gap: 8px; padding: 10px 16px; border-top: 1px solid var(--sd-border); background: var(--sd-surface-glass); }
.cp-act {
  display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
  padding: 7px 12px; border-radius: 10px; font-size: 11px; font-weight: 700;
  background: transparent; border: 1px solid var(--sd-cal-brd); color: var(--sd-cal-core);
  transition: background 0.18s;
}
.cp-act:hover { background: var(--sd-cal-soft); }
.cp-act.pins { border-color: color-mix(in srgb, var(--sd-cal-pin) 40%, transparent); color: var(--sd-cal-pin); }
.cp-act.pins:hover { background: var(--sd-cal-pin-soft); }

.tk-core { --tk: var(--sd-cal-core); } .tk-ember { --tk: var(--sd-cal-ember); }
.tk-rose { --tk: var(--sd-cal-rose); } .tk-gold { --tk: var(--sd-cal-gold); }
.tk-resume { --tk: var(--sd-cal-resume); } .tk-stone { --tk: var(--sd-cal-stone); }
.tk-moon { --tk: var(--sd-cal-moon); } .tk-pin { --tk: var(--sd-cal-pin); }
</style>
