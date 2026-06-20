<template>
  <Motion as="section" class="tr as-card"
    :initial="reduced ? false : { opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }">
    <header class="tr-head">
      <span class="tr-title"><AudioWaveform :size="14" /> Recorder tape</span>
      <span class="tr-span as-mono">
        <span>{{ fmtSpan(tmin) }}</span>
        <span class="tr-span-arrow"><ArrowRight :size="11" /></span>
        <span>{{ endpointLabel }}</span>
      </span>
    </header>

    <div class="tr-tape">
      <!-- density waveform backdrop -->
      <span class="tr-density" aria-hidden="true">
        <span v-for="(h, i) in buckets" :key="i" class="tr-bar" :style="{ height: `${8 + h * 80}%` }" />
      </span>
      <span class="tr-baseline" aria-hidden="true" />

      <!-- ambient sweep -->
      <span v-if="!reduced" class="tr-sweep" aria-hidden="true" />

      <!-- active playhead -->
      <Transition name="tr-fade">
        <span v-if="activePoint" class="tr-playhead" :style="{ left: `${activePoint.x * 100}%` }">
          <span class="tr-playhead-cap" :style="{ '--c': activePoint.color }" />
          <span class="tr-playhead-label as-mono">{{ fmtTiny(activePoint.ev.created_at) }}</span>
        </span>
      </Transition>

      <!-- event ticks -->
      <button v-for="p in points" :key="p.id" type="button" class="tr-tick"
        :class="{ on: p.id === activeId }" :style="{ left: `${p.x * 100}%`, '--c': p.color }"
        :title="`${p.label} · ${fmtTiny(p.ev.created_at)}`" @click="$emit('seek', p.id)">
        <span class="tr-tick-dot" />
      </button>
    </div>

    <!-- era axis -->
    <div class="tr-axis">
      <span v-for="(e, i) in eras" :key="i" class="tr-era as-mono" :style="{ left: `${e.x * 100}%` }">{{ e.label }}</span>
    </div>
  </Motion>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { AudioWaveform, ArrowRight } from 'lucide-vue-next'
import { eventMeta } from './histEventMeta.js'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  events: { type: Array, default: () => [] }, // newest-first
  activeId: { type: [String, Number, null], default: null },
})
defineEmits(['seek'])

const reduced = prefersReduced()

const times = computed(() => props.events.map(e => new Date(e.created_at).getTime()).filter(Boolean))
const tmin = computed(() => times.value.length ? Math.min(...times.value) : Date.now())
const tmax = computed(() => times.value.length ? Math.max(...times.value, Date.now()) : Date.now())
const spanMs = computed(() => Math.max(1, tmax.value - tmin.value))

// events → tick points positioned by time (even spread when span collapses)
const points = computed(() => props.events.map((ev, i) => {
  const t = new Date(ev.created_at).getTime()
  const m = eventMeta(ev.event_type)
  const x = spanMs.value > 1
    ? (t - tmin.value) / spanMs.value
    : (props.events.length > 1 ? i / (props.events.length - 1) : 0.5)
  return { id: ev.id ?? i, x, color: m.color, label: m.label, ev }
}))

const activePoint = computed(() => points.value.find(p => p.id === props.activeId) || null)

// density waveform — 28 buckets of event counts
const buckets = computed(() => {
  const N = 28
  const arr = new Array(N).fill(0)
  for (const p of points.value) arr[Math.min(N - 1, Math.floor(p.x * N))] += 1
  const max = Math.max(1, ...arr)
  return arr.map(v => v / max)
})

// era axis — genesis, midpoint, now
const eras = computed(() => {
  if (!times.value.length) return []
  return [
    { x: 0.02, label: fmtSpan(tmin.value) },
    { x: 0.99, label: 'now' },
  ]
})
const endpointLabel = computed(() => {
  // if last event retired/disposed, label the tape end with that date, else "now"
  const last = props.events[0]
  if (last && ['RETIRED', 'DISPOSAL_COMPLETED', 'DELETED'].includes(last.event_type)) return fmtSpan(last.created_at)
  return 'now'
})

function fmtSpan(d) {
  return new Date(d).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
}
function fmtTiny(d) {
  return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
}
</script>

<style scoped>
.tr { position: relative; overflow: hidden; padding: 14px 18px 12px; }
.tr-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.tr-title { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--as-text-dim); }
.tr-title :deep(svg) { color: var(--as-amber); }
.tr-span { display: inline-flex; align-items: center; gap: 7px; font-size: 10.5px; color: var(--as-text-dim); }
.tr-span-arrow { display: inline-flex; color: var(--as-text-dim); opacity: 0.6; }

.tr-tape { position: relative; height: 76px; border-radius: 13px; overflow: hidden;
  background: linear-gradient(180deg, var(--as-surface), color-mix(in srgb, var(--as-amber) 4%, var(--as-surface)));
  border: 1px solid var(--as-border-soft); }
.tr-density { position: absolute; inset: 0; display: flex; align-items: flex-end; gap: 0; padding: 0 2px; pointer-events: none; }
.tr-bar { flex: 1; margin: 0 0.6px; border-radius: 3px 3px 0 0; align-self: flex-end;
  background: linear-gradient(180deg, color-mix(in srgb, var(--as-amber) 32%, transparent), color-mix(in srgb, var(--as-amber) 8%, transparent));
  animation: tr-grow 0.7s var(--as-spring) both; transform-origin: bottom; }
.tr-baseline { position: absolute; left: 0; right: 0; bottom: 14px; height: 1px; background: var(--as-border-strong); opacity: 0.7; pointer-events: none; }
.tr-sweep { position: absolute; top: 0; bottom: 0; width: 70px; pointer-events: none;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--as-amber) 16%, transparent), transparent); animation: tr-sweep 6s linear infinite; }

.tr-playhead { position: absolute; top: 0; bottom: 0; width: 2px; transform: translateX(-1px); pointer-events: none; z-index: 3;
  background: linear-gradient(180deg, transparent, var(--as-amber), transparent); box-shadow: 0 0 12px color-mix(in srgb, var(--as-amber) 70%, transparent);
  transition: left 0.45s var(--as-spring); }
.tr-playhead-cap { position: absolute; top: -1px; left: 50%; width: 9px; height: 9px; margin-left: -4.5px; border-radius: 50%; background: var(--c, var(--as-amber)); box-shadow: 0 0 10px var(--c, var(--as-amber)); }
.tr-playhead-label { position: absolute; top: -2px; left: 8px; font-size: 9px; font-weight: 700; color: var(--as-amber); white-space: nowrap;
  background: var(--as-glass-deep); padding: 2px 6px; border-radius: 6px; border: 1px solid color-mix(in srgb, var(--as-amber) 30%, transparent); }

.tr-tick { position: absolute; bottom: 14px; transform: translate(-50%, 50%); width: 18px; height: 26px; padding: 0; border: none; background: none; cursor: pointer; z-index: 2; }
.tr-tick-dot { position: absolute; left: 50%; top: 50%; width: 9px; height: 9px; margin: -4.5px 0 0 -4.5px; border-radius: 50%;
  background: radial-gradient(circle at 36% 30%, #fff, var(--c) 62%, transparent); box-shadow: 0 0 7px color-mix(in srgb, var(--c) 70%, transparent);
  transition: transform 0.25s var(--as-spring), box-shadow 0.25s; }
.tr-tick:hover .tr-tick-dot { transform: scale(1.5); }
.tr-tick.on .tr-tick-dot { transform: scale(1.7); box-shadow: 0 0 0 4px color-mix(in srgb, var(--c) 22%, transparent), 0 0 12px color-mix(in srgb, var(--c) 80%, transparent); }

.tr-axis { position: relative; height: 14px; margin-top: 5px; }
.tr-era { position: absolute; transform: translateX(-50%); font-size: 9px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--as-text-dim); white-space: nowrap; }
.tr-era:first-child { transform: none; }
.tr-era:last-child { transform: translateX(-100%); }

.tr-fade-enter-active, .tr-fade-leave-active { transition: opacity 0.3s; }
.tr-fade-enter-from, .tr-fade-leave-to { opacity: 0; }

@keyframes tr-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
@keyframes tr-sweep { 0% { left: -70px; } 100% { left: 100%; } }
@media (prefers-reduced-motion: reduce) { .tr-bar, .tr-sweep { animation: none; } .tr-playhead { transition: none; } }
</style>
