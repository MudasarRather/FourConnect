<template>
  <!-- ░░ The Grand Concourse — departures-hall hero around the Solari board ░░ -->
  <header class="sd-ih sd-card">
    <div class="ih-shafts" aria-hidden="true" />
    <div class="ih-aura" aria-hidden="true" />

    <div class="ih-top">
      <div class="ih-lead">
        <Motion as="p" class="ih-eyebrow" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="t(0)">
          <span class="ih-dot" /> SUPPORT · GRAND CONCOURSE
        </Motion>
        <Motion as="h1" class="ih-title" :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }" :transition="t(0.06)">
          The <span class="grad">Concourse</span>
        </Motion>
        <Motion as="p" class="ih-sub" :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="t(0.12)">
          Every queue on the desk, called like departures — loads, gates and SLAs on the board, live.
        </Motion>

        <div class="ih-cta">
          <Motion v-for="(a, i) in actions" :key="a.key" as="button" type="button" class="ih-btn" :class="{ primary: i === 0 }"
            :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
            :transition="t(0.18 + i * 0.05)" @click="a.run">
            <component :is="a.icon" :size="15" /><span>{{ a.label }}</span>
          </Motion>
        </div>
      </div>

      <!-- station clock + live presence -->
      <Motion class="ih-station" :initial="{ opacity: 0, scale: 0.95 }" :animate="{ opacity: 1, scale: 1 }" :transition="t(0.2)">
        <div class="ih-clock" aria-label="station clock">
          <SdIntelFlap :value="clockHM" size="lg" />
          <span class="ih-clock-sec"><SdIntelFlap :value="clockS" size="sm" dimmed /></span>
        </div>
        <div class="ih-presence" :class="{ on: presence.agents_online > 0 }">
          <i class="pr-dot" aria-hidden="true" />
          <span class="pr-txt sd-mono">
            {{ presence.agents_online || 0 }} {{ presence.agents_online === 1 ? 'agent' : 'agents' }} on the floor
            <template v-if="presence.tickets_watched"> · {{ presence.tickets_watched }} desks live</template>
          </span>
        </div>
        <div class="ih-range" role="tablist" aria-label="analytics range">
          <button v-for="r in RANGES" :key="r" type="button" class="ih-range-btn sd-mono"
            :class="{ on: days === r }" role="tab" :aria-selected="days === r" @click="$emit('update:days', r)">
            {{ r }}D
          </button>
        </div>
      </Motion>
    </div>

    <!-- tannoy — major incident announcement -->
    <Motion v-if="incidentsActive" as="button" type="button" class="ih-tannoy" :initial="{ opacity: 0, y: -8 }"
      :animate="{ opacity: 1, y: 0 }" :transition="t(0.25)" @click="$emit('go', 'critical')">
      <span class="tn-badge sd-mono"><Megaphone :size="13" /> ANNOUNCEMENT</span>
      <span class="tn-track"><span class="tn-scroll sd-mono">
        <template v-for="m in incidents" :key="m.id">
          ⚠ MAJOR INCIDENT {{ m.ticket_number }} — {{ m.subject }} — OPEN {{ fmtMins(m.minutes_open) }}{{ m.acknowledged ? ' · ACK' : ' · UNACKNOWLEDGED' }} &nbsp;&nbsp;·&nbsp;&nbsp;
        </template>
      </span></span>
    </Motion>

    <!-- the Solari board -->
    <Motion :initial="{ opacity: 0, y: 22 }" :animate="{ opacity: 1, y: 0 }" :transition="t(0.28)">
      <SdIntelBoard :rows="boardRows" :loading="loading" @go="$emit('go', $event)" />
    </Motion>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import { Plus, Ticket, Timer, Megaphone } from 'lucide-vue-next'
import SdIntelFlap from './SdIntelFlap.vue'
import SdIntelBoard from './SdIntelBoard.vue'

defineProps({
  boardRows: { type: Array, default: () => [] },
  presence: { type: Object, default: () => ({}) },
  incidents: { type: Array, default: () => [] },
  incidentsActive: { type: Number, default: 0 },
  days: { type: Number, default: 30 },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['go', 'new', 'update:days'])

const t = (delay = 0) => ({ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] })
const RANGES = [7, 14, 30, 90]

const actions = [
  { key: 'new', label: 'New ticket', icon: Plus, run: () => emit('new') },
  { key: 'all', label: 'All tickets', icon: Ticket, run: () => emit('go', 'all') },
  { key: 'sla', label: 'SLA breached', icon: Timer, run: () => emit('go', 'breached') },
]

/* station clock — HH:MM on the big flaps, seconds on the small pair */
const now = ref(new Date())
let tick = null
onMounted(() => { tick = setInterval(() => { now.value = new Date() }, 1000) })
onBeforeUnmount(() => clearInterval(tick))
const two = (n) => String(n).padStart(2, '0')
const clockHM = computed(() => `${two(now.value.getHours())}:${two(now.value.getMinutes())}`)
const clockS = computed(() => two(now.value.getSeconds()))

const fmtMins = (m) => { if (m == null) return '—'; if (m < 60) return `${m}m`; if (m < 1440) return `${Math.floor(m / 60)}h ${m % 60}m`; return `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h` }
</script>

<style scoped>
.sd-ih { position: relative; overflow: hidden; border-radius: 24px; isolation: isolate;
  padding: 26px 28px 24px; border-color: var(--intel-border); display: flex; flex-direction: column; gap: 18px; }

/* hall atmosphere — skylight shafts drifting over the wall */
.ih-shafts { position: absolute; inset: -20% -10%; z-index: -1; opacity: 0.5; pointer-events: none;
  background: repeating-linear-gradient(104deg, transparent 0 90px, color-mix(in srgb, var(--intel) 5%, transparent) 90px 150px, transparent 150px 260px);
  animation: sd-ih-drift 26s linear infinite alternate; }
@keyframes sd-ih-drift { from { transform: translateX(-40px); } to { transform: translateX(50px); } }
.ih-aura { position: absolute; inset: 0; z-index: -1; pointer-events: none; background: var(--intel-aura); }

.ih-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 22px; flex-wrap: wrap; }
.ih-lead { max-width: 560px; min-width: 260px; }
.ih-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: var(--sd-mono); font-size: 11px;
  font-weight: 700; letter-spacing: 0.24em; text-transform: uppercase; color: var(--intel); margin: 0 0 10px; }
.ih-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--intel);
  box-shadow: 0 0 10px var(--intel-glow); animation: sd-pulse-ring 2.4s ease-out infinite; }
.ih-title { font-size: clamp(28px, 4vw, 46px); font-weight: 800; letter-spacing: -0.03em; line-height: 1.02;
  margin: 0 0 10px; color: var(--sd-text); }
.ih-title .grad { background: var(--intel-grad); -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; color: transparent; }
.ih-sub { font-size: 14.5px; color: var(--sd-text-secondary); margin: 0; max-width: 48ch; }

.ih-cta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
.ih-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 12px;
  font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid var(--sd-border-strong);
  background: rgba(255, 255, 255, 0.04); color: var(--sd-text); backdrop-filter: blur(8px);
  transition: border-color 0.25s var(--sd-spring); }
.ih-btn:hover { border-color: var(--intel-border); }
.ih-btn.primary { border: none; background: var(--intel-grad); color: var(--intel-ink); box-shadow: 0 8px 24px var(--intel-glow); }
/* :not(.primary) — this rule ties with .ih-btn.primary on specificity and comes
   later in the cascade, so without the guard it wipes the primary gradient in
   light mode (the invisible "New ticket" bug). */
[data-theme="light"] .ih-btn:not(.primary) { background: rgba(90, 60, 10, 0.05); }

/* station column */
.ih-station { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; flex-shrink: 0; }
.ih-clock { display: inline-flex; align-items: flex-end; gap: 6px; padding: 10px 12px; border-radius: 14px;
  background: linear-gradient(180deg, var(--intel-board-2), var(--intel-board));
  border: 1px solid rgba(244, 239, 227, 0.09); box-shadow: 0 14px 30px rgba(0, 0, 0, 0.35);
  /* the clock is part of the black machine — signage ink in both themes */
  --intel: var(--intel-sig); --intel-up: var(--intel-sig-up); --intel-dn: var(--intel-sig-dn); }
.ih-clock-sec { margin-bottom: 2px; }
.ih-presence { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 999px;
  border: 1px solid var(--sd-border); background: var(--sd-surface-glass); }
.pr-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--sd-text-dim); flex: none; }
.ih-presence.on .pr-dot { background: var(--intel-up); box-shadow: 0 0 9px var(--intel-up); animation: sd-pulse-ring 1.8s ease-in-out infinite; }
.pr-txt { font-size: 10.5px; color: var(--sd-text-secondary); letter-spacing: 0.04em; }

.ih-range { display: inline-flex; gap: 3px; padding: 3px; border-radius: 11px; border: 1px solid var(--sd-border);
  background: var(--sd-surface-glass); }
.ih-range-btn { padding: 5px 11px; border: 0; border-radius: 8px; background: transparent; cursor: pointer;
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.08em; color: var(--sd-text-muted); transition: color 0.18s, background 0.18s; }
.ih-range-btn:hover { color: var(--sd-text); }
.ih-range-btn.on { background: var(--intel-grad); color: var(--intel-ink); box-shadow: 0 4px 14px var(--intel-glow); }

/* tannoy — scrolling announcement */
.ih-tannoy { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 12px; width: 100%;
  padding: 8px 12px; border-radius: 12px; cursor: pointer; text-align: left;
  border: 1px solid color-mix(in srgb, var(--intel-dn) 45%, transparent);
  background: color-mix(in srgb, var(--intel-dn) 9%, transparent); }
.tn-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700;
  letter-spacing: 0.18em; color: var(--intel-dn); animation: sd-board-blink-h 1.6s steps(2, jump-none) infinite; }
@keyframes sd-board-blink-h { 50% { opacity: 0.45; } }
.tn-track { overflow: hidden; white-space: nowrap; mask-image: linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent); }
.tn-scroll { display: inline-block; font-size: 11.5px; letter-spacing: 0.1em; color: var(--sd-text-secondary);
  padding-left: 100%; animation: sd-ih-tannoy 26s linear infinite; }
@keyframes sd-ih-tannoy { to { transform: translateX(-100%); } }

@media (max-width: 860px) {
  .ih-top { flex-direction: column; }
  .ih-station { align-items: flex-start; }
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .ih-shafts,
  html:not([data-cinematic="on"]) .ih-dot,
  html:not([data-cinematic="on"]) .ih-presence.on .pr-dot,
  html:not([data-cinematic="on"]) .tn-badge { animation: none; }
  html:not([data-cinematic="on"]) .tn-scroll { animation: none; padding-left: 0; }
}
</style>
