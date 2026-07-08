<template>
  <!-- ░ VENDOR HAND-OFF CADENCE — how long each ticket has waited on its vendor (from
       vendor_dispatched_at) as a DISPATCHED → WAITING → OVERDUE relay ribbon with a live scan
       head, plus a responsive chase-cadence grid (never chased / overdue vs ETA / chased today)
       and the banked SLA "time off the clock". Fully responsive — tiles wrap, nothing clips. -->
  <section class="vdk sd-card" :class="{ reduced, hot: overdue > 0 }">
    <span class="vdk-topline" aria-hidden="true" />

    <header class="vdk-head">
      <span class="vdk-eyebrow sd-mono"><span class="vdk-eb-ic"><Truck :size="13" /></span> VENDOR HAND-OFF CADENCE</span>
      <div class="vdk-meta">
        <span class="m"><Clock :size="11" /> oldest <b>{{ oldestLabel }}</b></span>
        <span class="m banked" title="Customer-SLA time banked while off the clock"><Pause :size="11" /> <b>{{ bankedLabel }}</b> banked</span>
      </div>
    </header>

    <!-- wait ribbon -->
    <div class="vdk-ribbon-wrap">
      <div class="vdk-axis">
        <span class="ax a1"><i /> DISPATCHED</span>
        <span class="ax mid">WAITING →</span>
        <span class="ax end">OVERDUE <i /></span>
      </div>
      <div class="vdk-ribbon">
        <button
          v-for="b in buckets" :key="b.key" type="button"
          class="rib-seg" :class="{ on: active === b.key, empty: !b.count }"
          :style="{ flexGrow: b.count || 1, '--rc': b.color }"
          @click="$emit('pick', active === b.key ? '' : b.key)"
          :title="`${b.count} · ${b.label} waiting`"
        >
          <span class="rib-fill" />
          <span class="rib-body">
            <span class="rib-n" v-if="b.count"><SdCountUp :value="b.count" /></span>
            <span class="rib-lbl">{{ b.label }}</span>
          </span>
        </button>
        <span class="rib-scan" aria-hidden="true" />
        <span class="rib-cliff" :class="{ live: overdue > 0 }" title="Vendor OLA breach" />
      </div>
    </div>

    <!-- chase cadence — responsive grid, never clips -->
    <div class="vdk-tiles">
      <button type="button" class="vdk-tile warn" :class="{ on: active === 'no_chase', live: neverChased > 0 }" :style="{ '--i': 0 }"
        @click="$emit('pick', active === 'no_chase' ? '' : 'no_chase')" title="Waiting on a vendor with no chase ever sent">
        <span class="tl-ic"><BellOff :size="17" /></span>
        <span class="tl-body"><span class="tl-n"><SdCountUp :value="neverChased" /></span><span class="tl-lbl">Never chased</span></span>
        <span class="tl-spark" />
      </button>
      <button type="button" class="vdk-tile danger" :class="{ on: active === 'overdue', live: overdue > 0 }" :style="{ '--i': 1 }"
        @click="$emit('pick', active === 'overdue' ? '' : 'overdue')" title="Past the vendor's expected-return date">
        <span class="tl-ic"><AlarmClock :size="17" /></span>
        <span class="tl-body"><span class="tl-n"><SdCountUp :value="overdue" /></span><span class="tl-lbl">Overdue vs ETA</span></span>
        <span class="tl-spark" />
      </button>
      <button type="button" class="vdk-tile good" :class="{ on: active === 'chased_today', live: chasedToday > 0 }" :style="{ '--i': 2 }"
        @click="$emit('pick', active === 'chased_today' ? '' : 'chased_today')" title="Chased the vendor today">
        <span class="tl-ic"><Send :size="17" /></span>
        <span class="tl-body"><span class="tl-n"><SdCountUp :value="chasedToday" /></span><span class="tl-lbl">Chased today</span></span>
        <span class="tl-spark" />
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { Truck, Pause, Clock, BellOff, AlarmClock, Send } from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'

const props = defineProps({
  tickets: { type: Array, default: () => [] },
  now: { type: Number, default: () => Date.now() },
  active: { type: String, default: '' },
  reduced: { type: Boolean, default: false },
})
defineEmits(['pick'])

const HOUR = 3600000, DAY = 86400000
const ep = (v) => (v ? new Date(v).getTime() : 0)
const waitMs = (t) => {
  if (Number.isFinite(t.vendor_wait_ms) && t.vendor_wait_ms != null) return Math.max(0, t.vendor_wait_ms)
  const ref = ep(t.vendor_dispatched_at) || ep(t.pending_since) || ep(t.updated_at) || ep(t.created_at)
  return ref ? Math.max(0, props.now - ref) : 0
}
const isOverdue = (t) => {
  if (t.vendor_overdue != null) return !!t.vendor_overdue
  const due = ep(t.vendor_due_at)
  return due ? props.now > due : false
}
const isToday = (v) => {
  const ts = ep(v); if (!ts) return false
  const d = new Date(ts), n = new Date(props.now)
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
}

const DEFS = [
  { key: 'fresh', label: '< 1d', color: 'var(--sd-vendor-return)', test: (s) => s < DAY },
  { key: 'aging', label: '1–3d', color: 'var(--sd-vendor-signal)', test: (s) => s >= DAY && s < 3 * DAY },
  { key: 'stale', label: '> 3d', color: 'var(--sd-amber-strong)', test: (s) => s >= 3 * DAY },
]
const buckets = computed(() => {
  const out = DEFS.map(d => ({ ...d, count: 0 }))
  for (const t of props.tickets) { const s = waitMs(t); const hit = out.find(c => c.test(s)); if (hit) hit.count++ }
  return out
})

const neverChased = computed(() => props.tickets.filter(t => !(Number(t.vendor_reminder_count) || 0)).length)
const chasedToday = computed(() => props.tickets.filter(t => isToday(t.last_vendor_reminder_at)).length)
const overdue = computed(() => props.tickets.filter(isOverdue).length)

const oldestLabel = computed(() => {
  if (!props.tickets.length) return '—'
  const m = Math.max(0, ...props.tickets.map(waitMs))
  if (m < HOUR) return `${Math.max(1, Math.round(m / 60000))}m`
  if (m < DAY) return `${Math.round(m / HOUR)}h`
  return `${Math.round(m / DAY)}d`
})
const bankedLabel = computed(() => {
  const ms = props.tickets.reduce((a, t) => a + (Number(t.sla_paused_ms) || 0), 0)
    + props.tickets.reduce((a, t) => a + (t.pending_since ? Math.max(0, props.now - ep(t.pending_since)) : 0), 0)
  if (ms <= 0) return '0h'
  const h = ms / HOUR
  if (h < 48) return `${Math.round(h)}h`
  return `${Math.round(h / 24)}d`
})
</script>

<style scoped>
.vdk { position: relative; overflow: hidden; padding: 16px 18px 17px; display: flex; flex-direction: column; gap: 14px; }
.vdk::before { content: ''; position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background: radial-gradient(90% 130% at 100% 0%, var(--sd-vendor-signal-soft), transparent 55%),
              radial-gradient(70% 120% at 0% 100%, var(--sd-vendor-steel-soft), transparent 60%); }
.vdk.hot::before { background: radial-gradient(90% 130% at 100% 0%, var(--sd-vendor-overdue-soft), transparent 55%), radial-gradient(70% 120% at 0% 100%, var(--sd-vendor-steel-soft), transparent 60%); }
.vdk-topline { position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--sd-vendor-grad); opacity: 0.8; }

.vdk-head { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; z-index: 1; }
.vdk-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-size: 10px; font-weight: 700; letter-spacing: 0.16em; color: var(--sd-vendor-signal); }
.vdk-eb-ic { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 8px; color: var(--sd-vendor-signal); background: var(--sd-vendor-signal-soft); }
.vdk-meta { display: inline-flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.vdk-meta .m { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--sd-text-muted); }
.vdk-meta b { color: var(--sd-text); font-family: var(--sd-mono); font-weight: 800; }
.vdk-meta .banked { color: var(--sd-amber-strong); }

/* ── ribbon ── */
.vdk-ribbon-wrap { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 8px; }
.vdk-axis { display: flex; align-items: center; justify-content: space-between; font-size: 9px; font-weight: 800; letter-spacing: 0.14em; color: var(--sd-text-dim); font-family: var(--sd-mono); }
.ax { display: inline-flex; align-items: center; gap: 5px; }
.ax i { width: 6px; height: 6px; border-radius: 50%; }
.ax.a1 i { background: var(--sd-vendor-return); }
.ax.mid { color: var(--sd-text-muted); }
.ax.end { color: color-mix(in srgb, var(--sd-vendor-overdue) 82%, var(--sd-text-dim)); }
.ax.end i { background: var(--sd-vendor-overdue); box-shadow: 0 0 7px var(--sd-vendor-overdue); }

.vdk-ribbon { position: relative; display: flex; align-items: stretch; gap: 5px; height: 56px; padding-right: 10px; }
.rib-seg { position: relative; min-width: 46px; border: none; border-radius: 11px; cursor: pointer; overflow: hidden; padding: 0;
  background: color-mix(in srgb, var(--rc) 13%, var(--sd-surface-glass)); border: 1px solid color-mix(in srgb, var(--rc) 26%, transparent);
  display: grid; place-items: center; transition: flex-grow 0.55s var(--sd-spring), transform 0.18s, box-shadow 0.2s; font-family: inherit;
  animation: vdk-rise 0.5s var(--sd-spring) backwards; }
.rib-seg:hover { transform: translateY(-2px); }
.rib-seg.on { box-shadow: inset 0 0 0 1.6px var(--rc), 0 8px 22px color-mix(in srgb, var(--rc) 32%, transparent); }
.rib-seg.empty { opacity: 0.55; }
.rib-fill { position: absolute; inset: 0; background: linear-gradient(180deg, color-mix(in srgb, var(--rc) 55%, transparent), color-mix(in srgb, var(--rc) 16%, transparent));
  -webkit-mask-image: linear-gradient(100deg, transparent, #000 35%, #000 65%, transparent); mask-image: linear-gradient(100deg, transparent, #000 35%, #000 65%, transparent);
  background-size: 220% 100%; animation: vdk-flow 5s linear infinite; }
.rib-body { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 1px; }
.rib-n { font-size: 16px; font-weight: 850; color: var(--sd-text); font-variant-numeric: tabular-nums; line-height: 1; text-shadow: 0 1px 5px rgba(0,0,0,0.4); }
.rib-lbl { font-size: 9px; font-weight: 700; letter-spacing: 0.05em; color: var(--sd-text-muted); }
[data-theme="light"] .rib-n { text-shadow: 0 1px 2px rgba(255,255,255,0.6); }

/* sweeping scan head across the whole ribbon */
.rib-scan { position: absolute; top: 2px; bottom: 2px; width: 2px; left: 0; border-radius: 2px;
  background: linear-gradient(180deg, transparent, var(--sd-vendor-signal), transparent);
  box-shadow: 0 0 12px var(--sd-vendor-signal); opacity: 0.8; animation: vdk-scan 3.6s ease-in-out infinite; }
.vdk.hot .rib-scan { background: linear-gradient(180deg, transparent, var(--sd-vendor-overdue), transparent); box-shadow: 0 0 12px var(--sd-vendor-overdue); animation-duration: 2.2s; }
.rib-cliff { position: absolute; right: 0; top: -3px; bottom: -3px; width: 3px; border-radius: 3px; background: var(--sd-vendor-overdue); box-shadow: 0 0 10px var(--sd-vendor-overdue); }
.rib-cliff.live { animation: vdk-cliff 1.5s ease-in-out infinite; }

/* ── chase tiles — responsive, never clip ── */
.vdk-tiles { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
.vdk-tile { position: relative; display: flex; align-items: center; gap: 11px; padding: 12px 14px; border-radius: 14px; cursor: pointer; font-family: inherit; text-align: left; overflow: hidden;
  background: var(--sd-surface); border: 1px solid var(--sd-border); transition: border-color 0.2s, background 0.2s, transform 0.16s;
  animation: vdk-rise 0.5s var(--sd-spring) backwards; animation-delay: calc(var(--i, 0) * 0.06s + 0.15s); }
.vdk-tile:hover { border-color: color-mix(in srgb, var(--tc, var(--sd-vendor-signal)) 48%, transparent); transform: translateY(-2px); }
.vdk-tile.warn { --tc: var(--sd-amber-strong); }
.vdk-tile.danger { --tc: var(--sd-vendor-overdue); }
.vdk-tile.good { --tc: var(--sd-vendor-return); }
.vdk-tile.on { background: color-mix(in srgb, var(--tc) 12%, transparent); border-color: color-mix(in srgb, var(--tc) 50%, transparent); }
.tl-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; color: var(--tc, var(--sd-vendor-signal)); background: color-mix(in srgb, var(--tc, var(--sd-vendor-signal)) 15%, transparent); flex-shrink: 0; }
.tl-body { display: flex; flex-direction: column; min-width: 0; }
.tl-n { font-size: 21px; font-weight: 850; color: var(--sd-text); line-height: 1; letter-spacing: -0.02em; }
.tl-lbl { font-size: 11px; font-weight: 600; color: var(--sd-text-muted); margin-top: 3px; white-space: nowrap; }
.tl-spark { position: absolute; right: 0; top: 0; bottom: 0; width: 3px; background: var(--tc); transform: scaleY(0); transform-origin: bottom; transition: transform 0.3s var(--sd-spring); }
.vdk-tile:hover .tl-spark, .vdk-tile.on .tl-spark { transform: scaleY(1); }
.vdk-tile.live .tl-ic { animation: vdk-chip 2.2s ease-in-out infinite; }

@keyframes vdk-flow { to { background-position: -220% 0; } }
@keyframes vdk-scan { 0% { left: 0; opacity: 0; } 8% { opacity: 0.85; } 92% { opacity: 0.85; } 100% { left: calc(100% - 12px); opacity: 0; } }
@keyframes vdk-cliff { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
@keyframes vdk-chip { 0%, 100% { transform: scale(1); } 50% { transform: scale(0.86); } }
@keyframes vdk-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.vdk.reduced .rib-fill, .vdk.reduced .rib-scan, .vdk.reduced .rib-cliff, .vdk.reduced .vdk-tile.live .tl-ic, .vdk.reduced .rib-seg, .vdk.reduced .vdk-tile { animation: none !important; }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .rib-fill,
  html:not([data-cinematic="on"]) .rib-scan,
  html:not([data-cinematic="on"]) .rib-cliff,
  html:not([data-cinematic="on"]) .rib-seg,
  html:not([data-cinematic="on"]) .vdk-tile,
  html:not([data-cinematic="on"]) .vdk-tile.live .tl-ic { animation: none !important; }
}
</style>
