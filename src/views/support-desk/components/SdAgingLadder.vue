<template>
  <!-- ░ AGING & SLA BURN-DOWN — how long active work has been sitting, plus a stall
       detector (no activity in a while). Buckets + the stall tile are click-to-filter.
       A ServiceNow-style "idle/aging" surface the flat table never had. -->
  <section class="agl sd-card" :class="{ reduced }">
    <header class="agl-head">
      <span class="agl-eyebrow sd-mono"><History :size="13" /> AGING &amp; SLA BURN-DOWN</span>
      <span class="agl-meta">Oldest active <b>{{ oldestLabel }}</b></span>
    </header>

    <div class="agl-body">
      <!-- equalizer of age buckets -->
      <div class="agl-eq">
        <button
          v-for="b in buckets" :key="b.key" type="button"
          class="agl-bar" :class="{ on: active === b.key, empty: !b.count }" :style="{ '--bc': b.color }"
          @click="$emit('pick', active === b.key ? '' : b.key)"
          :title="`${b.count} ${b.count === 1 ? 'ticket' : 'tickets'} · ${b.label}`"
        >
          <span class="bar-track"><span class="bar-fill" :style="{ height: barH(b) }" /></span>
          <span class="bar-n"><SdCountUp :value="b.count" /></span>
          <span class="bar-lbl">{{ b.label }}</span>
        </button>
      </div>

      <!-- stall detector -->
      <button
        type="button" class="agl-stall" :class="{ on: active === 'stalled', live: stalled > 0 }"
        @click="$emit('pick', active === 'stalled' ? '' : 'stalled')"
        :title="`${stalled} ticket(s) with no activity in over ${stallHours}h`"
      >
        <span class="st-ic"><AlarmClockOff :size="17" /></span>
        <span class="st-body">
          <span class="st-n"><SdCountUp :value="stalled" /></span>
          <span class="st-lbl">Stalled <i>&gt;{{ stallHours }}h idle</i></span>
        </span>
        <span class="st-pulse" aria-hidden="true" />
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { History, AlarmClockOff } from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'

const props = defineProps({
  tickets: { type: Array, default: () => [] },
  now: { type: Number, default: () => Date.now() },
  active: { type: String, default: '' },
  stallHours: { type: Number, default: 8 },
  reduced: { type: Boolean, default: false },
})
defineEmits(['pick'])

const HOUR = 3600000
const DAY = 86400000
const ageMs = (t) => (t.created_at ? props.now - new Date(t.created_at).getTime() : 0)
const idleMs = (t) => {
  const ref = t.updated_at || t.last_viewed_at || t.created_at
  return ref ? props.now - new Date(ref).getTime() : 0
}

const DEFS = [
  { key: 'fresh', label: '< 1h', color: 'var(--sd-success)', test: (a) => a < HOUR },
  { key: 'today', label: 'Today', color: 'var(--sd-amber)', test: (a) => a >= HOUR && a < DAY },
  { key: 'd1_3', label: '1–3d', color: 'var(--sd-ember)', test: (a) => a >= DAY && a < 3 * DAY },
  { key: 'd3_7', label: '3–7d', color: 'var(--sd-ember-deep)', test: (a) => a >= 3 * DAY && a < 7 * DAY },
  { key: 'stuck', label: '> 7d', color: 'var(--sd-danger)', test: (a) => a >= 7 * DAY },
]

const buckets = computed(() => {
  const counts = DEFS.map(d => ({ ...d, count: 0 }))
  for (const t of props.tickets) {
    const a = ageMs(t)
    const hit = counts.find(c => c.test(a))
    if (hit) hit.count++
  }
  return counts
})
const maxCount = computed(() => Math.max(1, ...buckets.value.map(b => b.count)))
const barH = (b) => `${Math.max(b.count ? 12 : 4, Math.round((b.count / maxCount.value) * 100))}%`

const stalled = computed(() => props.tickets.filter(t => idleMs(t) > props.stallHours * HOUR).length)

const oldestLabel = computed(() => {
  if (!props.tickets.length) return '—'
  const max = Math.max(...props.tickets.map(ageMs))
  if (max < HOUR) return `${Math.max(1, Math.round(max / 60000))}m`
  if (max < DAY) return `${Math.round(max / HOUR)}h`
  return `${Math.round(max / DAY)}d`
})
</script>

<style scoped>
.agl { padding: 15px 18px 16px; display: flex; flex-direction: column; gap: 12px; }
.agl-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.agl-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 10px; font-weight: 700; letter-spacing: 0.16em; color: var(--sd-ember); }
.agl-meta { font-size: 11.5px; color: var(--sd-text-muted); }
.agl-meta b { color: var(--sd-text); font-family: var(--sd-mono); font-weight: 800; }

.agl-body { display: flex; align-items: stretch; gap: 16px; }
.agl-eq { flex: 1; display: flex; align-items: flex-end; gap: 8px; min-height: 92px; }
.agl-bar { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 6px 2px 0; border: none; background: none; cursor: pointer; font-family: inherit; border-radius: 10px; transition: transform 0.2s var(--sd-spring); }
.agl-bar:hover { transform: translateY(-2px); }
.bar-track { position: relative; width: 100%; max-width: 42px; height: 62px; display: flex; align-items: flex-end; justify-content: center; border-radius: 8px 8px 0 0; background: var(--sd-surface-glass); overflow: hidden; }
.bar-fill { width: 100%; border-radius: 8px 8px 0 0; background: linear-gradient(180deg, var(--bc), color-mix(in srgb, var(--bc) 55%, transparent)); box-shadow: 0 0 14px color-mix(in srgb, var(--bc) 40%, transparent); animation: agl-grow 0.7s var(--sd-spring) both; }
.agl-bar.empty .bar-fill { box-shadow: none; opacity: 0.5; }
.agl-bar.on .bar-track { box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--bc) 60%, transparent); }
.bar-n { font-size: 15px; font-weight: 800; color: var(--sd-text); font-variant-numeric: tabular-nums; line-height: 1; }
.bar-lbl { font-size: 10px; font-weight: 600; color: var(--sd-text-muted); white-space: nowrap; }
.agl-bar.on .bar-lbl { color: var(--bc); }

.agl-stall { position: relative; flex: 0 0 auto; width: 150px; display: flex; align-items: center; gap: 11px; padding: 12px 14px; border-radius: 14px; cursor: pointer; font-family: inherit; text-align: left;
  background: var(--sd-surface); border: 1px solid var(--sd-border); overflow: hidden; transition: border-color 0.2s, background 0.2s; }
.agl-stall:hover { border-color: color-mix(in srgb, var(--sd-warning) 45%, transparent); }
.agl-stall.on { background: color-mix(in srgb, var(--sd-warning) 12%, transparent); border-color: color-mix(in srgb, var(--sd-warning) 50%, transparent); }
.st-ic { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; color: var(--sd-warning); background: color-mix(in srgb, var(--sd-warning) 15%, transparent); flex-shrink: 0; }
.st-body { display: flex; flex-direction: column; min-width: 0; }
.st-n { font-size: 21px; font-weight: 850; color: var(--sd-text); line-height: 1; }
.st-lbl { font-size: 10.5px; font-weight: 600; color: var(--sd-text-muted); margin-top: 3px; }
.st-lbl i { font-style: normal; color: var(--sd-text-dim); }
.st-pulse { position: absolute; right: -30px; top: 50%; width: 60px; height: 60px; transform: translateY(-50%); border-radius: 50%; background: radial-gradient(circle, color-mix(in srgb, var(--sd-warning) 26%, transparent), transparent 68%); opacity: 0; }
.agl-stall.live .st-pulse { opacity: 1; animation: agl-pulse 2.4s ease-in-out infinite; }

@keyframes agl-grow { from { height: 0 !important; } }
@keyframes agl-pulse { 0%, 100% { opacity: 0.5; transform: translateY(-50%) scale(0.9); } 50% { opacity: 1; transform: translateY(-50%) scale(1.05); } }

@media (max-width: 560px) {
  .agl-body { flex-direction: column; }
  .agl-stall { width: 100%; }
}
.agl.reduced .bar-fill, .agl.reduced .st-pulse { animation: none !important; }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .bar-fill,
  html:not([data-cinematic="on"]) .st-pulse { animation: none !important; }
}
</style>
