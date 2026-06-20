<template>
  <Motion as="section" class="sp as-card"
    :initial="reduced ? false : { opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.55, delay: 0.12, ease: [0.16, 1, 0.3, 1] }">
    <header class="sp-head">
      <span class="sp-title"><GitCommitVertical :size="15" /> Chain of custody</span>
      <span class="sp-count as-mono">{{ shown.length }} / {{ events.length }} events</span>
    </header>

    <!-- lens filter rail -->
    <div v-if="presentCats.length > 1" class="sp-lenses">
      <button type="button" class="sp-lens all" :class="{ on: activeCats.size === 0 }" @click="activeCats.clear()">
        <Layers :size="12" /> All
      </button>
      <button v-for="c in presentCats" :key="c.key" type="button" class="sp-lens" :class="{ on: isOn(c.key) }"
        :style="{ '--c': c.color }" @click="toggle(c.key)">
        <span class="sp-lens-dot" /> {{ c.label }} <span class="sp-lens-n">{{ c.count }}</span>
      </button>
    </div>

    <!-- timeline scroll body -->
    <div class="sp-body" ref="bodyEl">
      <span v-if="!reduced" class="sp-scan" aria-hidden="true" />
      <transition name="sp-swap" mode="out-in">
        <div :key="listKey" class="sp-list">
          <template v-for="g in groups" :key="g.key">
            <div class="sp-day">
              <span class="sp-day-tick" />
              <span class="sp-day-label">{{ g.label }}</span>
              <span class="sp-day-line" />
              <span class="sp-day-n as-mono">{{ g.events.length }}</span>
            </div>
            <ol class="sp-ol">
              <HistEventCard v-for="row in g.events" :key="row.ev.id" :event="row.ev" :index="row.idx"
                :active="row.ev.id === activeId" :last="row.flatLast" @go="$emit('go', $event)" />
            </ol>
          </template>
        </div>
      </transition>
      <div v-if="!shown.length" class="sp-none">
        <Filter :size="15" /> No events in this lens. <button class="sp-none-reset" @click="activeCats.clear()">Show all</button>
      </div>
    </div>
  </Motion>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { Motion } from 'motion-v'
import { GitCommitVertical, Layers, Filter } from 'lucide-vue-next'
import HistEventCard from './HistEventCard.vue'
import { eventMeta, EVENT_CATEGORIES } from './histEventMeta.js'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  events: { type: Array, default: () => [] }, // newest-first
  activeId: { type: [String, Number, null], default: null },
})
defineEmits(['go'])

const reduced = prefersReduced()
const bodyEl = ref(null)
const activeCats = reactive(new Set())

const isOn = (k) => activeCats.size === 0 || activeCats.has(k)
function toggle(k) { activeCats.has(k) ? activeCats.delete(k) : activeCats.add(k) }

// categories actually present, with counts, in canonical order
const presentCats = computed(() => {
  const counts = {}
  for (const e of props.events) { const c = eventMeta(e.event_type).category; counts[c] = (counts[c] || 0) + 1 }
  return EVENT_CATEGORIES.filter(c => counts[c.key]).map(c => ({ ...c, count: counts[c.key] }))
})

const shown = computed(() => {
  if (activeCats.size === 0) return props.events
  return props.events.filter(e => activeCats.has(eventMeta(e.event_type).category))
})

const listKey = computed(() => [...activeCats].sort().join('|') || 'all')

// group by calendar day (newest-first), tagging each event with a flat index
const groups = computed(() => {
  const out = []
  let flat = 0
  const total = shown.value.length
  for (const ev of shown.value) {
    const d = new Date(ev.created_at)
    const key = d.toDateString()
    let g = out[out.length - 1]
    if (!g || g.key !== key) { g = { key, label: dayLabel(d), events: [] }; out.push(g) }
    g.events.push({ ev, idx: flat, flatLast: flat === total - 1 })
    flat++
  }
  return out
})

function dayLabel(d) {
  const now = new Date()
  const sameDay = (a, b) => a.toDateString() === b.toDateString()
  const y = new Date(now); y.setDate(now.getDate() - 1)
  if (sameDay(d, now)) return 'Today'
  if (sameDay(d, y)) return 'Yesterday'
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

// tape scrub → scroll the matching card to centre within the spine body only
watch(() => props.activeId, async (id) => {
  if (id == null) return
  await nextTick()
  const c = bodyEl.value
  const el = c?.querySelector(`#hev-${CSS.escape(String(id))}`)
  if (!c || !el) return
  const top = el.offsetTop - c.clientHeight / 2 + el.clientHeight / 2
  c.scrollTo({ top: Math.max(0, top), behavior: reduced ? 'auto' : 'smooth' })
})
</script>

<style scoped>
.sp { position: relative; overflow: hidden; padding: 16px 18px 8px; }
.sp-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 13px; }
.sp-title { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 800; color: var(--as-text); }
.sp-title :deep(svg) { color: var(--as-amber); }
.sp-count { font-size: 10.5px; color: var(--as-text-dim); }

/* lens rail */
.sp-lenses { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 14px; }
.sp-lens { display: inline-flex; align-items: center; gap: 6px; font: inherit; font-size: 11.5px; font-weight: 700; cursor: pointer;
  padding: 6px 11px; border-radius: 999px; color: var(--as-text-muted); background: var(--as-surface); border: 1px solid var(--as-border-soft);
  transition: color 0.2s, border-color 0.2s, background 0.2s, transform 0.15s; }
.sp-lens:hover { transform: translateY(-1px); border-color: var(--as-border-strong); }
.sp-lens.all :deep(svg) { color: var(--as-text-dim); }
.sp-lens.all.on { color: var(--as-amber); border-color: color-mix(in srgb, var(--as-amber) 36%, transparent); background: color-mix(in srgb, var(--as-amber) 10%, transparent); }
.sp-lens.all.on :deep(svg) { color: var(--as-amber); }
.sp-lens-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c); box-shadow: 0 0 6px var(--c); }
.sp-lens-n { font-size: 10px; font-weight: 800; opacity: 0.65; font-variant-numeric: tabular-nums; }
.sp-lens.on { color: var(--c); border-color: color-mix(in srgb, var(--c) 40%, transparent); background: color-mix(in srgb, var(--c) 11%, transparent); }

/* scroll body — position:relative so event cards' offsetTop is measured from here for tape-scrub centring */
.sp-body { position: relative; max-height: min(62vh, 620px); overflow-y: auto; padding: 2px 6px 8px 2px;
  -webkit-mask-image: linear-gradient(180deg, transparent, #000 2.5%, #000 97%, transparent);
  mask-image: linear-gradient(180deg, transparent, #000 2.5%, #000 97%, transparent); }
.sp-body::-webkit-scrollbar { width: 6px; }
.sp-body::-webkit-scrollbar-thumb { background: var(--as-border-strong); border-radius: 999px; }
.sp-body::-webkit-scrollbar-track { background: transparent; }
.sp-scan { position: absolute; left: 0; right: 0; top: 0; height: 90px; pointer-events: none; z-index: 4;
  background: linear-gradient(180deg, color-mix(in srgb, var(--as-amber) 18%, transparent), transparent); animation: sp-scan 1.3s ease-out 1 both; }

.sp-day { position: sticky; top: 0; z-index: 3; display: flex; align-items: center; gap: 9px; padding: 6px 4px 8px; backdrop-filter: blur(6px); }
.sp-day::before { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, var(--as-canvas), color-mix(in srgb, var(--as-canvas) 40%, transparent)); opacity: 0.85; z-index: -1; }
.sp-day-tick { width: 7px; height: 7px; border-radius: 50%; background: var(--as-amber); box-shadow: 0 0 8px color-mix(in srgb, var(--as-amber) 70%, transparent); margin-left: 11px; }
.sp-day-label { font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--as-text-secondary); }
.sp-day-line { flex: 1; height: 1px; background: var(--as-border-soft); }
.sp-day-n { font-size: 10px; color: var(--as-text-dim); }
.sp-ol { list-style: none; margin: 0; padding: 4px 0 0; }

.sp-none { display: flex; align-items: center; justify-content: center; gap: 9px; padding: 30px; font-size: 13px; color: var(--as-text-muted); }
.sp-none-reset { font: inherit; font-weight: 700; color: var(--as-amber); background: none; border: none; cursor: pointer; text-decoration: underline; }

.sp-swap-enter-active, .sp-swap-leave-active { transition: opacity 0.22s var(--as-ease); }
.sp-swap-enter-from, .sp-swap-leave-to { opacity: 0; }

@keyframes sp-scan { 0% { transform: translateY(-90px); opacity: 0; } 25% { opacity: 1; } 100% { transform: translateY(620px); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .sp-scan { animation: none; } }
</style>
