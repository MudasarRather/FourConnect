<template>
  <!-- Live reverse timer to the employee's last working day. The signature
       "Final Approach" chronograph: a draining notice meter, rolling DD:HH:MM:SS
       reels that tick in real time, a rotating radar accent + scanline, tone that
       escalates as the last day nears, and pointer parallax. -->
  <Motion ref="rootRef" as="section" class="sdc ex-grain" :class="toneClass"
    :initial="reduced ? false : { opacity: 0, y: 18, scale: 0.985 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
    :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }" :aria-label="ariaLabel">
    <!-- ambient backdrop -->
    <span class="sdc-aura" aria-hidden="true" />
    <span class="sdc-grid" aria-hidden="true" />
    <span class="sdc-radar" aria-hidden="true" />
    <span class="sdc-scan" aria-hidden="true" />
    <span v-for="m in motes" :key="'m' + m.i" class="sdc-mote" aria-hidden="true"
      :style="{ left: m.x + '%', bottom: m.y + '%', animationDuration: m.d + 's', animationDelay: m.delay + 's' }" />

    <div class="sdc-inner">
      <header class="sdc-head">
        <span class="sdc-eyebrow">
          <span class="sdc-live"><span class="sdc-live-dot" /> Live</span>
          <component :is="provisional ? Hourglass : TimerReset" :size="13" />
          {{ provisional ? 'Provisional countdown' : 'Countdown to your last day' }}
        </span>
        <span class="sdc-pill" :class="toneClass">
          <component :is="toneMeta.icon" :size="12" /> {{ toneMeta.label }}
        </span>
      </header>

      <!-- the rolling reel clock -->
      <div class="sdc-clock" :class="{ over: overdue }">
        <span v-if="overdue" class="sdc-plus">+</span>
        <template v-for="(g, gi) in groups" :key="g.key">
          <div class="sdc-grp">
            <div class="sdc-reels" :class="{ tick: g.key === 'sec' }">
              <span v-for="(d, di) in g.digits" :key="di" class="sdc-reel">
                <span class="sdc-strip" :style="{ transform: `translateY(${-d}em)` }">
                  <b v-for="n in 10" :key="n">{{ n - 1 }}</b>
                </span>
              </span>
            </div>
            <i class="sdc-unit">{{ g.label }}</i>
          </div>
          <span v-if="gi < groups.length - 1" class="sdc-sep" aria-hidden="true">:</span>
        </template>
      </div>

      <!-- draining notice meter + last-working-day -->
      <footer class="sdc-foot">
        <span class="sdc-lwd">
          <CalendarClock :size="13" />
          <template v-if="overdue">Last working day was <b>{{ fmtDate(lwd) }}</b></template>
          <template v-else><b>Last working day</b> · {{ fmtDate(lwd) }}</template>
        </span>
        <div class="sdc-meter" :title="`${pctServed}% of notice served`">
          <div class="sdc-meter-track">
            <span class="sdc-meter-fill" :style="{ width: remainPct + '%' }"><span class="sdc-meter-shine" /></span>
          </div>
          <span class="sdc-meter-cap">
            <b class="ex-mono">{{ remainPct }}%</b> {{ provisional ? 'window left' : 'of notice left' }}
          </span>
        </div>
      </footer>
    </div>
  </Motion>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import { TimerReset, Hourglass, CalendarClock, Flag, AlertTriangle, Plane, Sparkles } from 'lucide-vue-next'
import { fmtDate } from '@/composables/useExit'
import { prefersReduced, usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  lwd: { type: String, default: null },           // last (or requested) working date — YYYY-MM-DD
  noticeStart: { type: String, default: null },   // notice period start date
  noticeWindow: { type: Number, default: 30 },    // total notice days (for the drain meter)
  provisional: { type: Boolean, default: false }, // requested but not yet accepted
  // Authoritative "% of notice served" (from the backend notice_metrics). When
  // supplied, the drain meter shows exactly (100 − served) so the meter and the
  // hero medallion always sum to 100. Falls back to a window calc when null.
  servedPct: { type: Number, default: null },
})

const reduced = prefersReduced()
const rootRef = ref(null)
usePointerSpotlight(rootRef)

// ─── live clock — recompute the remaining delta every second ─────────────────
const now = ref(Date.now())
let timer = null
onMounted(() => { timer = setInterval(() => { now.value = Date.now() }, 1000) })
onBeforeUnmount(() => { if (timer) clearInterval(timer) })

// target = the END of the last working day (local), so HH:MM:SS keeps ticking
// through the final day instead of flipping to "0" at midnight.
const targetMs = computed(() => {
  if (!props.lwd) return null
  const d = new Date(props.lwd)
  if (isNaN(d.getTime())) return null
  d.setHours(23, 59, 59, 999)
  return d.getTime()
})
const deltaMs = computed(() => (targetMs.value == null ? 0 : targetMs.value - now.value))
const overdue = computed(() => deltaMs.value < 0)
const absMs = computed(() => Math.abs(deltaMs.value))

const parts = computed(() => {
  const t = Math.floor(absMs.value / 1000)
  return {
    days: Math.floor(t / 86400),
    hours: Math.floor((t % 86400) / 3600),
    mins: Math.floor((t % 3600) / 60),
    secs: t % 60,
  }
})

const toDigits = (n, pad) => String(Math.max(0, n)).padStart(pad, '0').split('').map(Number)
const groups = computed(() => {
  const p = parts.value
  return [
    { key: 'day', label: 'Days', digits: toDigits(p.days, p.days >= 100 ? 3 : 2) },
    { key: 'hr', label: 'Hours', digits: toDigits(p.hours, 2) },
    { key: 'min', label: 'Mins', digits: toDigits(p.mins, 2) },
    { key: 'sec', label: 'Secs', digits: toDigits(p.secs, 2) },
  ]
})

// the drain meter shows the notice window still ahead. Prefer the authoritative
// served% (so meter + medallion sum to 100); otherwise fall back to a date calc.
const remainPct = computed(() => {
  if (props.servedPct != null) return Math.max(0, Math.min(100, Math.round(100 - props.servedPct)))
  const w = Math.max(1, props.noticeWindow || 30)
  return Math.max(0, Math.min(100, Math.round((deltaMs.value / 86400000 / w) * 100)))
})

// ─── tone escalates as the last day nears ────────────────────────────────────
const toneClass = computed(() => {
  if (props.provisional) return 'prov'
  if (overdue.value) return 'over'
  const d = parts.value.days
  if (d <= 1) return 'crit'
  if (d <= 6) return 'urgent'
  return 'calm'
})
const TONE = {
  calm: { label: 'On your notice', icon: Plane },
  urgent: { label: 'Notice winding down', icon: Flag },
  crit: { label: 'Final stretch', icon: AlertTriangle },
  over: { label: 'Last day has passed', icon: Sparkles },
  prov: { label: 'Pending acceptance', icon: Hourglass },
}
const toneMeta = computed(() => TONE[toneClass.value] || TONE.calm)

const ariaLabel = computed(() => {
  const p = parts.value
  if (overdue.value) return `${p.days} days past your last working day`
  return `${p.days} days, ${p.hours} hours, ${p.mins} minutes remaining until your last working day`
})

// deterministic drifting motes (no Math.random)
const motes = Array.from({ length: 10 }, (_, i) => {
  let s = (i * 9301 + 49297) % 233280
  const x = 4 + (s / 233280) * 92
  s = (s * 9301 + 49297) % 233280
  return { i, x, y: 4 + (s / 233280) * 34, d: 7 + (i % 5) * 2, delay: (i % 6) * 0.7 }
})
</script>

<style scoped>
.sdc {
  position: relative; overflow: hidden; isolation: isolate; border-radius: 24px;
  padding: 22px 26px; margin-bottom: 16px;
  background:
    radial-gradient(120% 140% at 88% -10%, color-mix(in srgb, var(--sdc-accent) 14%, transparent), transparent 60%),
    var(--ex-surface-elevated);
  border: 1px solid var(--ex-border);
  box-shadow: var(--ex-card-shadow);
  --sdc-accent: var(--ex-amber);
  --sdc-accent-2: var(--ex-ember);
  --sdc-glow: rgba(251, 146, 60, 0.4);
}
.sdc.urgent { --sdc-accent: #fb923c; --sdc-accent-2: #ea580c; --sdc-glow: rgba(251, 146, 60, 0.5); }
.sdc.crit, .sdc.over { --sdc-accent: #f87171; --sdc-accent-2: #ef4444; --sdc-glow: rgba(239, 68, 68, 0.5); border-color: color-mix(in srgb, #ef4444 26%, transparent); }
.sdc.prov { --sdc-accent: var(--ex-steel); --sdc-accent-2: var(--ex-steel-dim); --sdc-glow: rgba(156, 163, 175, 0.32); }

/* ambient backdrop */
.sdc-aura { position: absolute; inset: -50% 30% 20% -10%; pointer-events: none;
  background: radial-gradient(60% 80% at 30% 10%, color-mix(in srgb, var(--sdc-accent) 24%, transparent), transparent 70%);
  animation: ex-aura-drift 12s ease-in-out infinite; }
.sdc-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.4;
  background-image: linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 30px 30px, 30px 30px;
  -webkit-mask: radial-gradient(130% 130% at 92% 8%, #000, transparent 72%); mask: radial-gradient(130% 130% at 92% 8%, #000, transparent 72%); }
[data-theme="light"] .sdc-grid { background-image: linear-gradient(rgba(120, 53, 15, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(120, 53, 15, 0.05) 1px, transparent 1px); }
.sdc-radar { position: absolute; top: 50%; right: -60px; width: 320px; height: 320px; transform: translateY(-50%); pointer-events: none; opacity: 0.5;
  background: conic-gradient(from 0deg, transparent 0deg, color-mix(in srgb, var(--sdc-accent) 30%, transparent) 36deg, transparent 70deg);
  -webkit-mask: radial-gradient(circle, #000 0, #000 58%, transparent 60%); mask: radial-gradient(circle, #000 0, #000 58%, transparent 60%);
  animation: ex-spin-slow 9s linear infinite; }
.sdc-scan { position: absolute; top: 0; bottom: 0; width: 32%; pointer-events: none; left: -40%;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--sdc-accent) 12%, transparent), transparent);
  animation: sdc-scan 6.5s ease-in-out infinite; }
.sdc-mote { position: absolute; width: 3px; height: 3px; border-radius: 50%; background: var(--sdc-accent);
  box-shadow: 0 0 7px var(--sdc-glow); opacity: 0; animation: sdc-rise linear infinite; pointer-events: none; }

/* inner — pointer parallax */
.sdc-inner { position: relative; z-index: 2; transition: transform 0.4s var(--ex-spring);
  transform: perspective(1200px) rotateX(calc((var(--my, 0.5) - 0.5) * -3deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 4deg)); }

.sdc-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.sdc-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ex-text-secondary); }
.sdc-eyebrow svg { color: var(--sdc-accent); }
.sdc-live { display: inline-flex; align-items: center; gap: 5px; font-size: 9.5px; font-weight: 850; letter-spacing: 0.1em; padding: 3px 8px; border-radius: 999px;
  color: var(--sdc-accent); background: color-mix(in srgb, var(--sdc-accent) 14%, transparent); border: 1px solid color-mix(in srgb, var(--sdc-accent) 30%, transparent); }
.sdc-live-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--sdc-accent); box-shadow: 0 0 8px var(--sdc-accent); animation: sdc-blink 1.4s ease-in-out infinite; }
.sdc-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 800; padding: 5px 12px; border-radius: 999px;
  color: var(--sdc-accent); background: color-mix(in srgb, var(--sdc-accent) 13%, transparent); border: 1px solid color-mix(in srgb, var(--sdc-accent) 32%, transparent); }
.sdc-pill.crit, .sdc-pill.over { animation: sdc-alert 1.5s ease-in-out infinite; }

/* the reel clock */
.sdc-clock { display: flex; align-items: flex-start; gap: 6px; }
.sdc-plus { font-family: var(--ex-mono); font-size: clamp(30px, 5vw, 52px); font-weight: 900; line-height: 1; color: var(--sdc-accent-2); margin-right: 2px; }
.sdc-grp { display: flex; flex-direction: column; align-items: center; gap: 7px; }
.sdc-reels { display: flex; gap: 3px; font-family: var(--ex-mono); font-size: clamp(34px, 6.4vw, 62px); font-weight: 900; line-height: 1; color: var(--ex-text); }
.sdc-reel { position: relative; height: 1em; width: 0.66em; overflow: hidden; border-radius: 11px;
  background: color-mix(in srgb, var(--ex-panel) 92%, var(--sdc-accent) 8%);
  border: 1px solid var(--ex-border); box-shadow: inset 0 -10px 18px -12px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.06); }
.sdc-reel::before { content: ''; position: absolute; left: 0; right: 0; top: 50%; height: 1px; z-index: 2; background: color-mix(in srgb, var(--sdc-accent) 36%, transparent); opacity: 0.5; }
.sdc-strip { display: flex; flex-direction: column; will-change: transform; transition: transform 0.62s cubic-bezier(0.16, 1, 0.3, 1); }
.sdc-strip b { height: 1em; display: grid; place-items: center; font-weight: 900;
  background: linear-gradient(180deg, var(--ex-text), color-mix(in srgb, var(--ex-text) 72%, var(--sdc-accent))); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.sdc-reels.tick .sdc-strip b { background: linear-gradient(180deg, var(--sdc-accent), var(--sdc-accent-2)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.sdc-unit { font-size: 9.5px; font-style: normal; font-weight: 850; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ex-text-muted); }
/* colon: a real flex item BETWEEN groups, sized to the reel box (1em) and
   top-aligned so it lines up with the digits (was absolute → hidden behind the
   next group's opaque reel). */
.sdc-sep { flex-shrink: 0; align-self: flex-start; display: flex; align-items: center; justify-content: center;
  height: 1em; width: 0.34em; font-family: var(--ex-mono); font-size: clamp(34px, 6.4vw, 62px); font-weight: 800; line-height: 1;
  color: color-mix(in srgb, var(--sdc-accent) 78%, var(--ex-text-dim)); animation: sdc-blink 1s steps(1) infinite; }

/* footer — last day + drain meter */
.sdc-foot { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-top: 18px; }
.sdc-lwd { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--ex-text-secondary); }
.sdc-lwd b { color: var(--ex-text); font-weight: 800; }
.sdc-lwd svg { color: var(--sdc-accent); }
.sdc-meter { display: flex; align-items: center; gap: 11px; min-width: 240px; flex: 1; max-width: 360px; }
.sdc-meter-track { position: relative; flex: 1; height: 8px; border-radius: 999px; overflow: hidden; background: var(--ex-steel-soft); border: 1px solid var(--ex-border); }
.sdc-meter-fill { position: relative; display: block; height: 100%; border-radius: 999px; overflow: hidden;
  background: linear-gradient(90deg, var(--sdc-accent-2), var(--sdc-accent)); box-shadow: 0 0 12px -2px var(--sdc-glow);
  transition: width 0.8s var(--ex-spring); }
.sdc-meter-shine { position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent); transform: translateX(-100%); animation: sdc-shine 2.6s linear infinite; }
.sdc-meter-cap { font-size: 11px; font-weight: 700; color: var(--ex-text-muted); white-space: nowrap; }
.sdc-meter-cap b { color: var(--ex-text); }

@keyframes sdc-scan { 0% { left: -40%; } 55%, 100% { left: 130%; } }
@keyframes sdc-rise { 0% { transform: translateY(0) scale(1); opacity: 0; } 14% { opacity: 0.85; } 100% { transform: translateY(-110px) scale(0.4); opacity: 0; } }
@keyframes sdc-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.28; } }
@keyframes sdc-shine { 0% { transform: translateX(-100%); } 100% { transform: translateX(220%); } }
@keyframes sdc-alert { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sdc-accent) 50%, transparent); } 50% { box-shadow: 0 0 0 5px transparent; } }

@media (max-width: 560px) {
  .sdc-reels { font-size: clamp(26px, 11vw, 40px); }
  .sdc-foot { gap: 10px; }
  .sdc-meter { max-width: none; }
}
@media (prefers-reduced-motion: reduce) {
  .sdc-aura, .sdc-radar, .sdc-scan, .sdc-mote, .sdc-live-dot, .sdc-sep, .sdc-meter-shine, .sdc-pill.crit, .sdc-pill.over { animation: none !important; }
  .sdc-mote { display: none; }
  .sdc-inner, .sdc-strip, .sdc-meter-fill { transition: none; }
}
</style>
