<template>
  <!-- ░ SILENCE & FOLLOW-UP CADENCE — how long each ticket has been quiet (measured from the
       last customer contact / pending entry, NOT created-age) laid out as a horizontal
       NOW → AUTO-CLOSE timeline, plus a reminder-cadence detector (never-nudged / imminent).
       A ServiceNow-style "awaiting response" surface the flat table never had. Distinct axis
       + shape from the Open tab's vertical created-age equalizer. -->
  <section class="cad sd-card" :class="{ reduced }">
    <span class="cad-accent" aria-hidden="true" />
    <span class="cad-grain" aria-hidden="true" />

    <header class="cad-head">
      <span class="cad-eyebrow sd-mono">
        <span class="cad-glyph"><Hourglass :size="12" /></span> SILENCE &amp; FOLLOW-UP CADENCE
      </span>
      <span class="cad-meta">Auto-closes after <b>{{ autoCloseDays }}d</b> silent · oldest <b>{{ oldestLabel }}</b></span>
    </header>

    <!-- ── horizontal silence timeline ── -->
    <div class="cad-timeline">
      <div class="cad-axis">
        <span class="ax now"><i class="ax-dot" /> NOW</span>
        <span class="ax mid">SILENCE →</span>
        <span class="ax end">AUTO-CLOSE</span>
      </div>

      <div class="cad-ribbon">
        <button
          v-for="b in buckets" :key="b.key" type="button"
          class="rib-seg" :class="{ on: active === b.key, empty: !b.count }"
          :style="{ flexGrow: b.count || 0.09, '--rc': b.color }"
          @click="$emit('pick', active === b.key ? '' : b.key)"
          :title="`${b.count} · ${b.label} silent`"
        >
          <span class="rib-fill" />
          <span v-if="b.count" class="rib-info">
            <span class="rib-n"><SdCountUp :value="b.count" /></span>
          </span>
        </button>
        <span class="rib-sweep" aria-hidden="true" />
        <span class="rib-cliff" :class="{ live: imminent > 0 }" title="Auto-close cliff" />
      </div>

      <!-- legend (always readable — labels never clip) -->
      <div class="cad-legend">
        <button
          v-for="b in buckets" :key="b.key" type="button"
          class="lg" :class="{ on: active === b.key }" :style="{ '--rc': b.color }"
          @click="$emit('pick', active === b.key ? '' : b.key)"
        >
          <i class="lg-dot" /> <span class="lg-lbl">{{ b.label }}</span> <b>{{ b.count }}</b>
        </button>
      </div>
    </div>

    <!-- ── reminder cadence detector (responsive grid — wraps, never clips) ── -->
    <div class="cad-tiles">
      <button type="button" class="cad-tile warn" :class="{ on: active === 'no_reminder', live: neverNudged > 0 }"
        @click="$emit('pick', active === 'no_reminder' ? '' : 'no_reminder')" title="Pending with no reminder ever sent">
        <span class="tl-ic"><BellOff :size="17" /></span>
        <span class="tl-body"><span class="tl-n"><SdCountUp :value="neverNudged" /></span><span class="tl-lbl">Never nudged</span></span>
        <span class="tl-aura" aria-hidden="true" />
      </button>

      <button type="button" class="cad-tile danger" :class="{ on: active === 'imminent', live: imminent > 0 }"
        @click="$emit('pick', active === 'imminent' ? '' : 'imminent')" title="Will auto-close within 24 hours">
        <span class="tl-ic"><Flame :size="17" /></span>
        <span class="tl-body"><span class="tl-n"><SdCountUp :value="imminent" /></span><span class="tl-lbl">Auto-close &lt;24h</span></span>
        <span class="tl-aura" aria-hidden="true" />
      </button>

      <div class="cad-tile stat">
        <span class="tl-ic"><BellRing :size="17" /></span>
        <span class="tl-body"><span class="tl-n"><SdCountUp :value="remindersSent" /></span><span class="tl-lbl">Reminders sent</span></span>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { Hourglass, BellOff, BellRing, Flame } from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'

const props = defineProps({
  tickets: { type: Array, default: () => [] },
  now: { type: Number, default: () => Date.now() },
  active: { type: String, default: '' },
  autoCloseDays: { type: Number, default: 7 },
  reduced: { type: Boolean, default: false },
})
defineEmits(['pick'])

const HOUR = 3600000, DAY = 86400000
const ep = (v) => (v ? new Date(v).getTime() : 0)
// silence measured from pending entry / last customer reply (stable across reminders), not created-age.
const silenceMs = (t) => {
  const ref = ep(t.pending_since) || ep(t.last_customer_reply_at) || ep(t.updated_at) || ep(t.created_at)
  return ref ? Math.max(0, props.now - ref) : 0
}

const DEFS = [
  { key: 'fresh', label: '< 1d', color: 'var(--sd-success)', test: (s) => s < DAY },
  { key: 'w1_3', label: '1–3d', color: 'var(--sd-amber)', test: (s) => s >= DAY && s < 3 * DAY },
  { key: 'cold', label: '3–7d', color: 'var(--sd-ember)', test: (s) => s >= 3 * DAY && s < 7 * DAY },
  { key: 'stale', label: '> 7d', color: 'var(--sd-danger)', test: (s) => s >= 7 * DAY },
]
const buckets = computed(() => {
  const out = DEFS.map(d => ({ ...d, count: 0 }))
  for (const t of props.tickets) { const s = silenceMs(t); const hit = out.find(c => c.test(s)); if (hit) hit.count++ }
  return out
})

const neverNudged = computed(() => props.tickets.filter(t => !(Number(t.reminder_count) || 0)).length)
const remindersSent = computed(() => props.tickets.reduce((a, t) => a + (Number(t.reminder_count) || 0), 0))
const imminent = computed(() => props.tickets.filter(t => {
  const eta = ep(t.auto_close_at) || (silenceMs(t) ? props.now - silenceMs(t) + props.autoCloseDays * DAY : 0)
  return eta && (eta - props.now) > 0 && (eta - props.now) <= DAY
}).length)

const oldestLabel = computed(() => {
  if (!props.tickets.length) return '—'
  const m = Math.max(...props.tickets.map(silenceMs))
  if (m < HOUR) return `${Math.max(1, Math.round(m / 60000))}m`
  if (m < DAY) return `${Math.round(m / HOUR)}h`
  return `${Math.round(m / DAY)}d`
})
</script>

<style scoped>
.cad { position: relative; padding: 16px 18px 18px; display: flex; flex-direction: column; gap: 15px; overflow: hidden; }
.cad-accent { position: absolute; inset: 0 0 auto 0; height: 2px; z-index: 1; background: linear-gradient(90deg, transparent, var(--sd-success), var(--sd-amber), var(--sd-ember), var(--sd-danger), transparent); background-size: 220% 100%; animation: cad-accent 7s linear infinite; }
.cad-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.5; background-image: radial-gradient(color-mix(in srgb, var(--sd-st-pending) 6%, transparent) 1px, transparent 1px); background-size: 22px 22px;
  -webkit-mask-image: linear-gradient(180deg, rgba(0,0,0,0.4), transparent 70%); mask-image: linear-gradient(180deg, rgba(0,0,0,0.4), transparent 70%); }

.cad-head { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.cad-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-size: 10px; font-weight: 700; letter-spacing: 0.16em; color: var(--sd-st-pending); }
.cad-glyph { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 8px; color: var(--sd-st-pending);
  background: color-mix(in srgb, var(--sd-st-pending) 14%, transparent); border: 1px solid color-mix(in srgb, var(--sd-st-pending) 28%, transparent); animation: cad-tilt 5s ease-in-out infinite; }
.cad-meta { font-size: 11.5px; color: var(--sd-text-muted); }
.cad-meta b { color: var(--sd-text); font-family: var(--sd-mono); font-weight: 800; }

/* ── timeline ── */
.cad-timeline { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 9px; min-width: 0; }
.cad-axis { display: flex; align-items: center; justify-content: space-between; font-size: 9px; font-weight: 700; letter-spacing: 0.14em; color: var(--sd-text-dim); font-family: var(--sd-mono); }
.ax { display: inline-flex; align-items: center; gap: 5px; }
.ax.now .ax-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--sd-success); box-shadow: 0 0 8px var(--sd-success); animation: cad-beat 2.4s ease-in-out infinite; }
.ax.mid { color: var(--sd-text-muted); }
.ax.end { color: color-mix(in srgb, var(--sd-danger) 82%, var(--sd-text-dim)); }

.cad-ribbon { position: relative; display: flex; align-items: stretch; gap: 4px; height: 52px; padding-right: 12px; }
.rib-seg { position: relative; min-width: 12px; border-radius: 11px; cursor: pointer; overflow: hidden; padding: 0;
  background: color-mix(in srgb, var(--rc) 13%, var(--sd-surface-glass)); border: 1px solid color-mix(in srgb, var(--rc) 26%, transparent);
  display: grid; place-items: center; transition: flex-grow 0.55s var(--sd-spring), transform 0.2s var(--sd-spring), box-shadow 0.24s; font-family: inherit; }
.rib-seg:hover { transform: translateY(-2px); box-shadow: 0 6px 16px color-mix(in srgb, var(--rc) 26%, transparent); }
.rib-seg.on { box-shadow: inset 0 0 0 1.8px var(--rc), 0 8px 22px color-mix(in srgb, var(--rc) 34%, transparent); }
.rib-seg.empty { opacity: 0.38; }
.rib-fill { position: absolute; inset: 0; background: linear-gradient(180deg, color-mix(in srgb, var(--rc) 66%, transparent), color-mix(in srgb, var(--rc) 22%, transparent));
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 30%); mask-image: linear-gradient(90deg, transparent, #000 30%); animation: cad-flow 5s linear infinite; background-size: 200% 100%; }
.rib-info { position: relative; z-index: 1; display: grid; place-items: center; }
.rib-n { font-size: 15px; font-weight: 850; color: var(--sd-text); font-variant-numeric: tabular-nums; text-shadow: 0 1px 4px rgba(0,0,0,0.35); }
[data-theme="light"] .rib-n { text-shadow: 0 1px 2px rgba(255,255,255,0.65); }
/* a light "silence sweep" gliding NOW → AUTO-CLOSE */
.rib-sweep { position: absolute; top: 0; bottom: 0; width: 46px; z-index: 2; pointer-events: none; border-radius: 40px;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--sd-st-pending) 26%, transparent), transparent);
  filter: blur(3px); animation: cad-sweep 5.5s ease-in-out infinite; }
.rib-cliff { position: absolute; right: 0; top: -3px; bottom: -3px; width: 3px; border-radius: 3px; background: var(--sd-danger); box-shadow: 0 0 10px var(--sd-danger); }
.rib-cliff.live { animation: cad-cliff 1.7s ease-in-out infinite; }

.cad-legend { display: flex; flex-wrap: wrap; gap: 8px; }
.lg { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; font-size: 10.5px; font-weight: 600; cursor: pointer; font-family: inherit;
  color: var(--sd-text-muted); background: var(--sd-surface-glass); border: 1px solid var(--sd-border); transition: color 0.18s, border-color 0.18s, background 0.18s; }
.lg:hover { color: var(--sd-text); border-color: color-mix(in srgb, var(--rc) 45%, transparent); }
.lg.on { color: var(--sd-text); background: color-mix(in srgb, var(--rc) 12%, transparent); border-color: color-mix(in srgb, var(--rc) 48%, transparent); }
.lg-dot { width: 8px; height: 8px; border-radius: 3px; background: var(--rc); flex-shrink: 0; }
.lg b { color: var(--sd-text); font-weight: 800; font-family: var(--sd-mono); }

/* ── reminder cadence tiles (responsive, wrapping, non-clipping) ── */
.cad-tiles { display: flex; flex-wrap: wrap; gap: 10px; position: relative; z-index: 2; }
.cad-tile { flex: 1 1 168px; min-width: 152px; max-width: 340px; display: flex; align-items: center; gap: 11px; padding: 11px 13px; border-radius: 14px; cursor: pointer; font-family: inherit; text-align: left;
  background: var(--sd-surface); border: 1px solid var(--sd-border); position: relative; overflow: hidden; transition: border-color 0.2s, background 0.2s, transform 0.2s var(--sd-spring), box-shadow 0.24s; }
.cad-tile.stat { cursor: default; }
.cad-tile:not(.stat):hover { border-color: color-mix(in srgb, var(--tc, var(--sd-amber)) 48%, transparent); transform: translateY(-2px); box-shadow: 0 10px 24px color-mix(in srgb, var(--tc, var(--sd-amber)) 18%, transparent); }
.cad-tile.warn { --tc: var(--sd-amber-strong); }
.cad-tile.danger { --tc: var(--sd-danger); }
.cad-tile.stat { --tc: var(--sd-st-pending); }
.cad-tile.on { background: color-mix(in srgb, var(--tc) 12%, transparent); border-color: color-mix(in srgb, var(--tc) 52%, transparent); }
.tl-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; color: var(--tc); flex-shrink: 0; z-index: 1;
  background: color-mix(in srgb, var(--tc) 15%, transparent); border: 1px solid color-mix(in srgb, var(--tc) 26%, transparent); }
.tl-body { display: flex; flex-direction: column; min-width: 0; z-index: 1; }
.tl-n { font-size: 20px; font-weight: 850; color: var(--sd-text); line-height: 1; letter-spacing: -0.02em; }
.tl-lbl { font-size: 10.5px; font-weight: 600; color: var(--sd-text-muted); margin-top: 4px; line-height: 1.2; }
/* ambient aura sweep for the "live" (actionable) tiles */
.tl-aura { position: absolute; inset: 0; z-index: 0; opacity: 0; background: radial-gradient(120px 60px at 12% 50%, color-mix(in srgb, var(--tc) 18%, transparent), transparent 70%); transition: opacity 0.3s; }
.cad-tile.live .tl-aura { opacity: 1; animation: cad-aura 3.4s ease-in-out infinite; }
.cad-tile.live .tl-ic { animation: cad-chip 2.2s ease-in-out infinite; }

@keyframes cad-flow { to { background-position: -200% 0; } }
@keyframes cad-accent { to { background-position: -220% 0; } }
@keyframes cad-sweep { 0% { left: -46px; opacity: 0; } 12% { opacity: 1; } 88% { opacity: 1; } 100% { left: 100%; opacity: 0; } }
@keyframes cad-cliff { 0%, 100% { opacity: 1; } 50% { opacity: 0.42; } }
@keyframes cad-chip { 0%, 100% { transform: scale(1); } 50% { transform: scale(0.88); } }
@keyframes cad-aura { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
@keyframes cad-tilt { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(180deg); } }
@keyframes cad-beat { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.35); opacity: 0.7; } }

.cad.reduced .rib-fill, .cad.reduced .rib-sweep, .cad.reduced .rib-cliff, .cad.reduced .cad-accent,
.cad.reduced .cad-glyph, .cad.reduced .ax.now .ax-dot, .cad.reduced .cad-tile.live .tl-ic, .cad.reduced .cad-tile.live .tl-aura { animation: none !important; }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .rib-fill,
  html:not([data-cinematic="on"]) .rib-sweep,
  html:not([data-cinematic="on"]) .rib-cliff,
  html:not([data-cinematic="on"]) .cad-accent,
  html:not([data-cinematic="on"]) .cad-glyph,
  html:not([data-cinematic="on"]) .ax.now .ax-dot,
  html:not([data-cinematic="on"]) .cad-tile.live .tl-ic,
  html:not([data-cinematic="on"]) .cad-tile.live .tl-aura { animation: none !important; }
}
</style>
