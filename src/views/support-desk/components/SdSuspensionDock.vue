<template>
  <div class="dok" ref="rootRef" :class="{ reduced: red, alert: overdueN > 0 }"
    :style="{ '--dok-h': height + 'px' }" @pointermove="onMove" @pointerleave="onLeave">
    <span class="dok-tag sd-mono"><Anchor :size="11" /> SUSPENSION DOCK · ATELIER</span>
    <span class="dok-tick t-tl" /><span class="dok-tick t-tr" /><span class="dok-tick t-bl" /><span class="dok-tick t-br" />

    <!-- bright-studio atmosphere: soft top light, drifting warm motes, launch-ad specular sweep -->
    <div class="dok-atm" aria-hidden="true">
      <div class="dok-skylight" />
      <span v-for="m in 10" :key="'m' + m" class="mote" :style="moteStyle(m)" />
      <span class="sweep" />
    </div>

    <!-- HUD (top-left, gallery style) -->
    <div class="dok-hud" v-if="tickets.length">
      <span class="hud-n"><SdCountUp :value="tickets.length" /></span>
      <span class="hud-lbl sd-mono">IN SUSPENSION<br>CLOCKS FROZEN</span>
    </div>
    <span class="dok-stasis sd-mono" v-if="tickets.length"><i /> STASIS</span>

    <!-- overhead gantry: polished aluminium rail + chrome trolley -->
    <div class="gantry" aria-hidden="true">
      <div class="rail" />
      <div class="trolley" :class="{ patrol: trolleyPatrol && !red, busy: !trolleyPatrol }" :style="trolleyStyle">
        <span class="trl-body"><span class="trl-light" /></span>
        <span class="trl-hook" />
      </div>
    </div>

    <!-- suspended crates (real held tickets) -->
    <div class="bay">
      <div v-for="(slot, i) in slots" :key="slot.key" class="slot" :style="{ left: slotLeft(i) }">
        <!-- breathing contact shadow on the studio floor (counter-phased with the sway) -->
        <span class="floorshadow" :class="{ off: !slot.ticket || slot.departing }" :style="swayStyle(i)" />
        <div class="sway" :style="swayStyle(i)">
          <template v-if="slot.ticket">
            <Presence>
              <Motion v-if="!slot.departing" as="div" class="drop"
                :initial="{ y: -170, opacity: 0 }"
                :animate="{ y: 0, opacity: 1 }"
                :exit="{ y: 190, opacity: 0 }"
                :transition="{ duration: 0.95, ease: [0.16, 1, 0.3, 1], delay: i * 0.08 }">
                <span class="cable" /><span class="shackle" />
                <button class="crate" :class="crateTone(slot.ticket)" type="button"
                  :title="slot.ticket.subject" @click="emit('open', slot.ticket)">
                  <span class="cr-edge" :style="{ background: priorityColor(slot.ticket.priority) }" />
                  <span class="cr-top">
                    <b class="cr-no sd-mono">{{ slot.ticket.ticket_number }}</b>
                    <i v-if="slot.ticket.hold_stale" class="cr-stale sd-mono" title="Hold review due">STALE</i>
                  </span>
                  <span class="cr-subj">{{ slot.ticket.subject }}</span>
                  <span class="cr-foot">
                    <i class="cr-reason sd-mono">{{ holdReasonShort(slot.ticket.hold_reason_code) }}</i>
                    <i class="cr-eta sd-mono" :class="etaTone(slot.ticket)">
                      <TriangleAlert v-if="etaTone(slot.ticket) === 'over'" :size="9" />
                      <Timer v-else :size="9" /> {{ etaLabel(slot.ticket) }}
                    </i>
                  </span>
                  <span class="cr-release" @click.stop="emit('resume', slot.ticket)" title="Resume — lift the hold">
                    <Play :size="10" /> RELEASE
                  </span>
                  <span v-if="etaTone(slot.ticket) === 'over'" class="cr-strobe" />
                </button>
              </Motion>
            </Presence>
            <!-- emerald departure flash -->
            <Presence>
              <Motion v-if="slot.departing" as="span" class="dep-pop"
                :initial="{ opacity: 0, y: 8, scale: 0.85 }"
                :animate="{ opacity: 1, y: -6, scale: 1 }"
                :exit="{ opacity: 0, y: -26 }"
                :transition="{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }">
                <Play :size="11" /> Released — back in work
              </Motion>
            </Presence>
          </template>
          <template v-else>
            <span class="cable idle" /><span class="shackle idle" />
          </template>
        </div>
      </div>
    </div>

    <!-- studio floor line -->
    <div class="floorline" aria-hidden="true" />

    <!-- overflow + empty plate -->
    <span v-if="extraN > 0" class="dok-more sd-mono">+{{ extraN }} more suspended</span>
    <div v-if="!tickets.length" class="dok-clear">
      <span class="clr-seal"><Anchor :size="15" /></span>
      <b>Dock clear</b>
      <span>Nothing is suspended — every ticket is in motion.</span>
    </div>

    <!-- readout chips (below the floor) -->
    <div class="dok-chips" v-if="tickets.length">
      <span class="hud-chip danger" :class="{ live: overdueN > 0 }"><TriangleAlert :size="10" /> <b>{{ overdueN }}</b> overdue release</span>
      <span class="hud-chip ember"><CalendarClock :size="10" /> <b>{{ scheduledN }}</b> scheduled</span>
      <span class="hud-chip warn" :class="{ live: staleN > 0 }"><Snowflake :size="10" /> <b>{{ staleN }}</b> stale</span>
    </div>
  </div>
</template>

<script setup>
/*
  SdSuspensionDock v2 — "ATELIER DOCK" (user picked study 01 from the light-stage motion
  gallery). The suspension-dock story re-lit as a bright product table: LIGHT vitrine in
  BOTH themes (the user's explicit ask — no obsidian panel), polished aluminium rail,
  chrome trolley (idle patrol → travels to the bay on release), frosted-glass crates on
  steel cables with pendulum sway, and the two launch-ad tells from the study: breathing
  CONTACT SHADOWS on the studio floor (same phase as each crate's sway) and a periodic
  SPECULAR SWEEP across the stage. Release choreography: trolley eases over → crate
  descends below the floor and fades → emerald "Released" pill → backfill crate drops in
  from the rail with a spring overshoot. Interior colors are literal (ink-on-light) so the
  panel reads identically in dark mode — a lit display case in a dark room.
  Ambient motion runs even at 0 data. DOM + motion-v; reduced-motion guarded.
*/
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { Anchor, Play, Timer, TriangleAlert, CalendarClock, Snowflake } from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'
import { priorityColor, holdReasonShort } from '@/composables/useSupportDesk'

const props = defineProps({
  tickets: { type: Array, default: () => [] },   // the on-hold working set (section sorts)
  height: { type: Number, default: 330 },
  reduced: { type: Boolean, default: false },
})
const emit = defineEmits(['open', 'resume'])

const MAX = 4
const rootRef = ref(null)
const cinematicOn = () => document.documentElement.getAttribute('data-cinematic') === 'on'
const red = ref(props.reduced || (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && !cinematicOn()))

/* ── minute tick for the release countdowns ── */
const now = ref(Date.now())
let tickT = null
onMounted(() => { tickT = setInterval(() => { now.value = Date.now() }, 30000) })
onBeforeUnmount(() => { clearInterval(tickT); clearTimeout(depT); clearTimeout(depT2) })

/* ── local mirror of the visible crates so departures can be choreographed ──
   slots is a FIXED array of MAX bays; each holds { key, ticket, departing }. */
const slots = ref(Array.from({ length: MAX }, (_, i) => ({ key: 'bay' + i, ticket: null, departing: false })))
const extraN = computed(() => Math.max(0, props.tickets.length - MAX))

const trolleyPatrol = ref(true)
const trolleyX = ref(50)
const trolleyStyle = computed(() => trolleyPatrol.value ? {} : { left: trolleyX.value + '%' })
let depT = null, depT2 = null

function fillSlots() {
  const want = props.tickets.slice(0, MAX)
  const wantIds = new Set(want.map(t => String(t.id)))
  // refresh in-place (same ticket object may carry fresher fields)
  for (const s of slots.value) {
    if (s.ticket && wantIds.has(String(s.ticket.id))) {
      s.ticket = want.find(t => String(t.id) === String(s.ticket.id))
      wantIds.delete(String(s.ticket.id))
    }
  }
  // place new arrivals into free bays
  for (const t of want) {
    if (!wantIds.has(String(t.id))) continue
    const free = slots.value.find(s => !s.ticket)
    if (free) { free.ticket = t; free.departing = false; wantIds.delete(String(t.id)) }
  }
}

function departSlot(s, i) {
  // trolley travels to the bay, then the crate descends below the floor with an emerald flash
  trolleyPatrol.value = false
  trolleyX.value = 12.5 + i * 25
  s.departing = true                              // Presence exit lowers the crate
  depT = setTimeout(() => {
    s.ticket = null
    s.departing = false
    fillSlots()                                   // backfill from the queue
    depT2 = setTimeout(() => { trolleyPatrol.value = true }, 700)
  }, red.value ? 60 : 1100)
}

watch(() => props.tickets, (list) => {
  const ids = new Set((list || []).map(t => String(t.id)))
  let departed = false
  slots.value.forEach((s, i) => {
    if (s.ticket && !ids.has(String(s.ticket.id)) && !s.departing) { departSlot(s, i); departed = true }
  })
  if (!departed) fillSlots()
}, { deep: false })
onMounted(fillSlots)

/* ── layout + ambient ── */
const slotLeft = (i) => (i * 25) + '%'
const swayStyle = (i) => red.value ? {} : {
  animationDuration: (7.2 + (i % 3) * 1.1) + 's',
  animationDelay: (-i * 1.9) + 's',
}
function moteStyle(m) {
  const l = (m * 41) % 100, t = 14 + (m * 47) % 70
  return { left: l + '%', top: t + '%', animationDuration: (11 + (m % 5) * 3) + 's', animationDelay: (-m * 1.6) + 's' }
}

/* pointer parallax on the skylight */
const px = ref(0)
function onMove(e) {
  const r = rootRef.value?.getBoundingClientRect()
  if (!r) return
  px.value = ((e.clientX - r.left) / r.width - 0.5) * 2
  rootRef.value.style.setProperty('--dok-px', px.value.toFixed(3))
}
function onLeave() { rootRef.value?.style.setProperty('--dok-px', '0') }

/* ── manifest readouts ── */
const DAY = 86400000, HOUR = 3600000, MIN = 60000
function releaseAt(t) {
  const v = t.auto_resume_at || t.hold_until
  return v ? new Date(v).getTime() : null
}
function etaTone(t) {
  const r = releaseAt(t)
  if (r == null) return 'none'
  return r <= now.value ? 'over' : 'sched'
}
function etaLabel(t) {
  const r = releaseAt(t)
  if (r == null) return 'NO DATE'
  const d = r - now.value
  if (d <= 0) return 'OVERDUE'
  if (d < HOUR) return `RELEASE ${Math.max(1, Math.round(d / MIN))}m`
  if (d < DAY) return `RELEASE ${Math.round(d / HOUR)}h`
  return `RELEASE ${Math.round(d / DAY)}d`
}
function crateTone(t) {
  const tone = etaTone(t)
  return { over: tone === 'over', stale: !!t.hold_stale && tone !== 'over' }
}
const overdueN = computed(() => props.tickets.filter(t => etaTone(t) === 'over').length)
const scheduledN = computed(() => props.tickets.filter(t => etaTone(t) === 'sched').length)
const staleN = computed(() => props.tickets.filter(t => !!t.hold_stale).length)
</script>

<style scoped>
/* ── the atelier stage — THEME-ADAPTIVE (user's correction of the light-everywhere v2):
   dark theme = a NIGHT atelier (warm-graphite glass case, lamp-lit), light theme = the
   bright product table. All interior colors route through the --dk-* vars below; the
   :root defaults are the DARK variant, [data-theme="light"] overrides to the bright one.
   Same geometry + motion (sway, contact shadows, trolley, specular sweep) in both. */
.dok {
  /* night-atelier palette (dark theme default) */
  --dk-stage-a: #211b13;
  --dk-stage-b: #120e09;
  --dk-border: rgba(214, 178, 94, 0.22);
  --dk-inset-hi: rgba(255, 236, 200, 0.09);
  --dk-ink: #f4ead8;
  --dk-sub: #b7a888;
  --dk-faint: #8a7d64;
  --dk-accent: #f0b45c;
  --dk-rail-a: #453d31; --dk-rail-b: #29221a; --dk-rail-c: #171310;
  --dk-rail-rivet: rgba(251, 214, 137, 0.26);
  --dk-rail-shadow: rgba(0, 0, 0, 0.55);
  --dk-trl-a: #55483a; --dk-trl-b: #2b251d;
  --dk-trl-border: rgba(251, 214, 137, 0.38);
  --dk-metal: #8d949c;
  --dk-crate-bg: rgba(48, 40, 29, 0.88);
  --dk-crate-border: rgba(214, 178, 94, 0.34);
  --dk-crate-border-hov: rgba(251, 214, 137, 0.58);
  --dk-crate-shadow: rgba(0, 0, 0, 0.55);
  --dk-crate-glow: rgba(245, 158, 11, 0.18);
  --dk-no: #fbd689;
  --dk-reason-ink: #d9c6a4; --dk-reason-bg: rgba(181, 158, 125, 0.16); --dk-reason-brd: rgba(181, 158, 125, 0.38);
  --dk-eta-sched: #f59e0b; --dk-eta-over: #ef4444;
  --dk-stale-ink: #fcd34d; --dk-stale-bg: rgba(251, 191, 36, 0.14); --dk-stale-brd: rgba(251, 191, 36, 0.46);
  --dk-floorshadow: rgba(0, 0, 0, 0.55);
  --dk-floorline: rgba(214, 178, 94, 0.2);
  --dk-mote: rgba(251, 214, 137, 0.42);
  --dk-sweep: rgba(255, 244, 214, 0.16);
  --dk-chip-bg: rgba(20, 17, 12, 0.82); --dk-chip-brd: rgba(214, 178, 94, 0.26); --dk-chip-ink: #d9c6a4;
  --dk-chip-danger: #fca5a5; --dk-chip-ember: #fcd34d;
  --dk-more-bg: rgba(38, 31, 22, 0.85); --dk-more-brd: rgba(214, 178, 94, 0.3);
  position: relative; width: 100%; height: var(--dok-h, 330px); border-radius: 20px; overflow: hidden;
  background: linear-gradient(178deg, var(--dk-stage-a) 4%, var(--dk-stage-b) 96%);
  border: 1px solid var(--dk-border);
  box-shadow: inset 0 1px 0 var(--dk-inset-hi), inset 0 -34px 56px rgba(0, 0, 0, 0.35),
    0 22px 46px -16px rgba(0, 0, 0, 0.45);
}
[data-theme="light"] .dok {
  /* bright product table (the approved study-01 stage) */
  --dk-stage-a: #fdfcfa;
  --dk-stage-b: #f0ede6;
  --dk-border: rgba(120, 100, 60, 0.16);
  --dk-inset-hi: rgba(255, 255, 255, 0.95);
  --dk-ink: #201d19;
  --dk-sub: #70685c;
  --dk-faint: #a79d8e;
  --dk-accent: #b08430;
  --dk-rail-a: #fdfdfc; --dk-rail-b: #d8d4cc; --dk-rail-c: #b9b3a7;
  --dk-rail-rivet: rgba(120, 105, 80, 0.3);
  --dk-rail-shadow: rgba(90, 70, 35, 0.4);
  --dk-trl-a: #ffffff; --dk-trl-b: #cfcac1;
  --dk-trl-border: rgba(90, 75, 45, 0.24);
  --dk-metal: #98a0a8;
  --dk-crate-bg: rgba(255, 255, 255, 0.82);
  --dk-crate-border: rgba(90, 75, 45, 0.18);
  --dk-crate-border-hov: rgba(217, 119, 6, 0.45);
  --dk-crate-shadow: rgba(90, 70, 35, 0.35);
  --dk-crate-glow: rgba(240, 161, 27, 0.16);
  --dk-no: #c47b06;
  --dk-reason-ink: #7d6f57; --dk-reason-bg: rgba(181, 158, 125, 0.16); --dk-reason-brd: rgba(181, 158, 125, 0.42);
  --dk-eta-sched: #d97706; --dk-eta-over: #dc2626;
  --dk-stale-ink: #a16207; --dk-stale-bg: rgba(240, 161, 27, 0.13); --dk-stale-brd: rgba(217, 119, 6, 0.5);
  --dk-floorshadow: rgba(90, 70, 35, 0.26);
  --dk-floorline: rgba(90, 75, 45, 0.2);
  --dk-mote: rgba(170, 145, 100, 0.28);
  --dk-sweep: rgba(255, 255, 255, 0.75);
  --dk-chip-bg: rgba(255, 255, 255, 0.88); --dk-chip-brd: rgba(120, 100, 60, 0.18); --dk-chip-ink: #70685c;
  --dk-chip-danger: #b91c1c; --dk-chip-ember: #b45309;
  --dk-more-bg: rgba(255, 255, 255, 0.85); --dk-more-brd: rgba(120, 100, 60, 0.22);
  box-shadow: inset 0 2px 0 var(--dk-inset-hi), inset 0 -34px 56px rgba(120, 100, 60, 0.07),
    0 20px 44px -18px rgba(120, 80, 30, 0.22);
}

.dok-tag { position: absolute; top: 11px; left: 50%; transform: translateX(-50%); z-index: 8; display: inline-flex; align-items: center; gap: 6px; font-size: 8.5px; font-weight: 800; letter-spacing: 0.2em; color: var(--dk-accent); opacity: 0.9; white-space: nowrap; }
.dok-tick { position: absolute; width: 12px; height: 12px; z-index: 8; border: 1.4px solid color-mix(in srgb, var(--dk-accent) 46%, transparent); opacity: 0.7; }
.t-tl { top: 9px; left: 9px; border-right: none; border-bottom: none; }
.t-tr { top: 9px; right: 9px; border-left: none; border-bottom: none; }
.t-bl { bottom: 9px; left: 9px; border-right: none; border-top: none; }
.t-br { bottom: 9px; right: 9px; border-left: none; border-top: none; }

/* atmosphere */
.dok-atm { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.dok-skylight {
  position: absolute; inset: -10% -20%; opacity: 0.9;
  background: radial-gradient(60% 45% at 50% -6%, rgba(90, 66, 30, 0.55), transparent 60%),
    radial-gradient(40% 32% at 22% 0%, rgba(120, 84, 34, 0.3), transparent 65%);
  transform: translateX(calc(var(--dok-px, 0) * 14px)); transition: transform 0.6s ease-out;
}
[data-theme="light"] .dok-skylight {
  background: radial-gradient(60% 45% at 50% -6%, rgba(255, 255, 255, 0.95), transparent 60%),
    radial-gradient(40% 32% at 22% 0%, rgba(250, 235, 205, 0.5), transparent 65%);
}
.mote { position: absolute; width: 3px; height: 3px; border-radius: 50%; background: var(--dk-mote); filter: blur(0.5px); animation: dok-mote 13s linear infinite; }
.sweep { position: absolute; top: -20%; bottom: -20%; width: 150px; z-index: 3;
  background: linear-gradient(100deg, transparent, var(--dk-sweep) 48%, transparent);
  transform: translateX(-320px) rotate(7deg); filter: blur(6px); animation: dok-sweep 9s ease-in-out infinite; }

/* HUD */
.dok-hud { position: absolute; left: 20px; top: 14px; z-index: 7; display: flex; align-items: center; gap: 9px; pointer-events: none; }
.hud-n { font-size: 25px; font-weight: 850; color: var(--dk-ink); letter-spacing: -0.03em; line-height: 1; }
.hud-lbl { font-size: 8px; font-weight: 800; letter-spacing: 0.16em; color: var(--dk-faint); line-height: 1.5; }
.dok-stasis { position: absolute; right: 20px; top: 17px; z-index: 7; display: inline-flex; align-items: center; gap: 6px; font-size: 8.5px; font-weight: 800; letter-spacing: 0.18em; color: var(--dk-accent); }
.dok-stasis i { width: 6px; height: 6px; border-radius: 50%; background: #e19b23; box-shadow: 0 0 8px rgba(225, 155, 35, 0.7); animation: dok-blip 2.8s ease-in-out infinite; }

/* gantry — polished metal (aluminium by day, gunmetal by night) */
.gantry { position: absolute; top: 44px; left: 30px; right: 30px; z-index: 5; height: 20px; }
.rail {
  position: absolute; left: 0; right: 0; top: 4px; height: 12px; border-radius: 7px;
  background: linear-gradient(180deg, var(--dk-rail-a), var(--dk-rail-b) 55%, var(--dk-rail-c));
  box-shadow: 0 8px 16px -6px var(--dk-rail-shadow), inset 0 1px 0 var(--dk-inset-hi);
}
.rail::after { content: ''; position: absolute; inset: 3px 8px; border-radius: 4px;
  background: repeating-linear-gradient(90deg, var(--dk-rail-rivet) 0 3px, transparent 3px 28px); opacity: 0.6; }
.trolley { position: absolute; top: -8px; width: 48px; height: 32px; margin-left: -24px; z-index: 6; transition: left 1.1s cubic-bezier(0.16, 1, 0.3, 1); }
.trolley.patrol { animation: dok-patrol 26s ease-in-out infinite; }
.trl-body { position: absolute; top: 0; left: 5px; right: 5px; height: 16px; border-radius: 6px;
  background: linear-gradient(180deg, var(--dk-trl-a), var(--dk-trl-b)); border: 1px solid var(--dk-trl-border);
  box-shadow: 0 6px 12px -4px var(--dk-rail-shadow); display: block; }
.trl-light { position: absolute; top: 4.5px; right: 5px; width: 5px; height: 5px; border-radius: 50%; background: #22b982; box-shadow: 0 0 7px rgba(34, 185, 130, 0.8); animation: dok-blip 2s ease-in-out infinite; }
.trolley.busy .trl-light { background: #e19b23; box-shadow: 0 0 8px rgba(225, 155, 35, 0.9); animation-duration: 0.6s; }
.trl-hook { position: absolute; top: 16px; left: 50%; width: 2px; height: 9px; margin-left: -1px; background: var(--dk-metal); display: block; }
.trl-hook::after { content: ''; position: absolute; bottom: -5px; left: -3px; width: 8px; height: 6px; border: 2px solid var(--dk-metal); border-top: none; border-radius: 0 0 7px 7px; }

/* bays */
.bay { position: absolute; top: 58px; left: 30px; right: 30px; bottom: 0; z-index: 4; }
.slot { position: absolute; top: 0; width: 25%; height: 100%; display: flex; justify-content: center; }
.sway { position: relative; display: flex; flex-direction: column; align-items: center; transform-origin: top center; animation: dok-sway 7.6s ease-in-out infinite; height: 100%; width: 100%; }
.drop { display: flex; flex-direction: column; align-items: center; width: 100%; }
.cable { width: 2px; height: 40px; background: linear-gradient(180deg, color-mix(in srgb, var(--dk-metal) 78%, #fff), var(--dk-metal)); }
.cable.idle { height: 26px; opacity: 0.5; }
.shackle { width: 10px; height: 8px; border: 2px solid var(--dk-metal); border-top: none; border-radius: 0 0 8px 8px; margin-top: -1px; }
.shackle.idle { opacity: 0.5; animation: dok-hookswing 5s ease-in-out infinite; transform-origin: top center; }

/* breathing contact shadow on the studio floor (counter-phased with the sway) */
.floorshadow {
  position: absolute; bottom: 46px; left: 50%; width: 128px; height: 16px; margin-left: -64px; border-radius: 50%;
  background: radial-gradient(ellipse, var(--dk-floorshadow), transparent 70%); filter: blur(4px);
  animation: dok-floorshadow 7.6s ease-in-out infinite; transition: opacity 0.5s ease; z-index: 1;
}
.floorshadow.off { opacity: 0; }

/* crate — frosted glass (white glass by day, smoked amber glass by night) */
.crate {
  position: relative; width: min(158px, 96%); margin-top: 2px; text-align: left; cursor: pointer;
  display: flex; flex-direction: column; gap: 5px; padding: 9px 10px 8px 14px; border-radius: 13px;
  background: var(--dk-crate-bg);
  -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
  border: 1px solid var(--dk-crate-border);
  box-shadow: 0 16px 30px -12px var(--dk-crate-shadow), inset 0 1px 0 var(--dk-inset-hi);
  color: var(--dk-ink); font: inherit;
  transition: transform 0.25s var(--sd-spring, cubic-bezier(0.16, 1, 0.3, 1)), box-shadow 0.25s ease, border-color 0.25s ease;
}
.crate:hover { transform: translateY(-3px) scale(1.02); border-color: var(--dk-crate-border-hov); box-shadow: 0 20px 36px -12px var(--dk-crate-shadow), 0 0 22px var(--dk-crate-glow); }
.crate.over { border-color: color-mix(in srgb, var(--dk-eta-over) 52%, transparent); }
.crate.stale { border-style: dashed; }
.cr-edge { position: absolute; left: 0; top: 10px; bottom: 10px; width: 3.5px; border-radius: 3px; }
.cr-top { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.cr-no { font-size: 10.5px; font-weight: 800; letter-spacing: 0.03em; color: var(--dk-no); }
.cr-stale { font-size: 8px; font-weight: 800; font-style: normal; letter-spacing: 0.12em; padding: 1.5px 5px; border-radius: 5px; color: var(--dk-stale-ink); background: var(--dk-stale-bg); border: 1px dashed var(--dk-stale-brd); }
.cr-subj { font-size: 11px; font-weight: 650; line-height: 1.3; color: var(--dk-ink); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 28px; }
.cr-foot { display: flex; align-items: center; justify-content: space-between; gap: 3px 6px; min-width: 0; flex-wrap: wrap; }
.cr-reason { font-size: 8px; font-weight: 800; font-style: normal; letter-spacing: 0.1em; padding: 2px 6px; border-radius: 5px; color: var(--dk-reason-ink); background: var(--dk-reason-bg); border: 1px solid var(--dk-reason-brd); white-space: nowrap; }
.cr-eta { display: inline-flex; align-items: center; gap: 3px; font-size: 8.5px; font-weight: 800; font-style: normal; letter-spacing: 0.05em; white-space: nowrap; color: var(--dk-sub); }
.cr-eta.sched { color: var(--dk-eta-sched); }
.cr-eta.none { color: var(--dk-faint); }
.cr-eta.over { color: var(--dk-eta-over); }
.cr-release {
  position: absolute; right: 7px; top: -9px; display: inline-flex; align-items: center; gap: 4px;
  font-size: 8px; font-weight: 800; letter-spacing: 0.1em; padding: 3px 8px; border-radius: 999px;
  color: #fff; background: linear-gradient(135deg, #24c08b, #0f9d6f);
  box-shadow: 0 6px 16px rgba(15, 157, 111, 0.4); opacity: 0; transform: translateY(4px);
  transition: opacity 0.22s ease, transform 0.22s var(--sd-spring, cubic-bezier(0.16, 1, 0.3, 1)); cursor: pointer;
}
.crate:hover .cr-release { opacity: 1; transform: translateY(0); }
.cr-strobe { position: absolute; top: 7px; right: 8px; width: 6px; height: 6px; border-radius: 50%; background: var(--dk-eta-over); box-shadow: 0 0 9px color-mix(in srgb, var(--dk-eta-over) 80%, transparent); animation: dok-strobe 1.1s ease-in-out infinite; }

.dep-pop {
  position: absolute; top: 42%; left: 50%; transform: translateX(-50%); z-index: 7; white-space: nowrap;
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; border-radius: 999px;
  font-size: 11px; font-weight: 750; color: #fff; background: linear-gradient(135deg, #24c08b, #0f9d6f);
  box-shadow: 0 14px 32px -8px rgba(15, 157, 111, 0.55);
}

/* studio floor */
.floorline { position: absolute; left: 30px; right: 30px; bottom: 40px; height: 1px; z-index: 2;
  background: linear-gradient(90deg, transparent, var(--dk-floorline), transparent); }

.dok-more { position: absolute; right: 16px; bottom: 11px; z-index: 8; font-size: 8.5px; font-weight: 800; letter-spacing: 0.12em; color: var(--dk-sub); padding: 4px 9px; border-radius: 999px; background: var(--dk-more-bg); border: 1px solid var(--dk-more-brd); }

.dok-clear { position: absolute; inset: 0; z-index: 6; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; text-align: center; pointer-events: none; }
.clr-seal { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 14px; color: var(--dk-no); background: rgba(240, 161, 27, 0.12); border: 1px solid rgba(217, 119, 6, 0.34); box-shadow: 0 0 26px rgba(240, 161, 27, 0.16); animation: dok-breathe 4.5s ease-in-out infinite; }
.dok-clear b { font-size: 15px; font-weight: 800; color: var(--dk-ink); letter-spacing: -0.01em; }
.dok-clear span:last-child { font-size: 11px; color: var(--dk-sub); max-width: 240px; }

/* readout chips below the floor */
.dok-chips { position: absolute; left: 0; right: 0; bottom: 9px; z-index: 7; display: flex; justify-content: center; gap: 7px; flex-wrap: wrap; pointer-events: none; }
.hud-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 999px; font-size: 9px; font-weight: 650; color: var(--dk-chip-ink); background: var(--dk-chip-bg); border: 1px solid var(--dk-chip-brd); box-shadow: 0 4px 10px -4px rgba(0, 0, 0, 0.25); }
.hud-chip b { font-family: var(--sd-mono); font-weight: 800; font-size: 9.5px; color: var(--dk-ink); }
.hud-chip.danger { color: var(--dk-chip-danger); border-color: color-mix(in srgb, var(--dk-eta-over) 34%, transparent); }
.hud-chip.danger b { color: var(--dk-chip-danger); }
.hud-chip.ember { color: var(--dk-chip-ember); border-color: color-mix(in srgb, var(--dk-eta-sched) 34%, transparent); }
.hud-chip.ember b { color: var(--dk-chip-ember); }
.hud-chip.warn { color: var(--dk-reason-ink); }
.hud-chip.live { animation: dok-blip 2.2s ease-in-out infinite; }

/* keyframes */
@keyframes dok-sway { 0%, 100% { transform: rotate(1.15deg); } 50% { transform: rotate(-1.15deg); } }
@keyframes dok-floorshadow { 0%, 100% { transform: translateX(11px) scaleX(1); opacity: 0.95; } 50% { transform: translateX(-11px) scaleX(0.92); opacity: 0.7; } }
@keyframes dok-hookswing { 0%, 100% { transform: rotate(5deg); } 50% { transform: rotate(-5deg); } }
@keyframes dok-patrol { 0%, 100% { left: 12%; } 46% { left: 88%; } 54% { left: 88%; } }
@keyframes dok-blip { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
@keyframes dok-mote { 0% { transform: translate(0, 0); opacity: 0; } 12% { opacity: 0.8; } 88% { opacity: 0.5; } 100% { transform: translate(30px, -44px); opacity: 0; } }
@keyframes dok-sweep { 0%, 60% { transform: translateX(-320px) rotate(7deg); } 88%, 100% { transform: translateX(1300px) rotate(7deg); } }
@keyframes dok-strobe { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.35; transform: scale(0.8); } }
@keyframes dok-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }

/* reduced motion: static atelier (crates still render; no loops) */
.dok.reduced .sway, .dok.reduced .floorshadow, .dok.reduced .shackle.idle, .dok.reduced .trolley.patrol,
.dok.reduced .trl-light, .dok.reduced .dok-stasis i, .dok.reduced .sweep, .dok.reduced .mote,
.dok.reduced .cr-strobe, .dok.reduced .hud-chip.live, .dok.reduced .clr-seal { animation: none !important; }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .sway,
  html:not([data-cinematic="on"]) .floorshadow,
  html:not([data-cinematic="on"]) .shackle.idle,
  html:not([data-cinematic="on"]) .trolley.patrol,
  html:not([data-cinematic="on"]) .trl-light,
  html:not([data-cinematic="on"]) .dok-stasis i,
  html:not([data-cinematic="on"]) .sweep,
  html:not([data-cinematic="on"]) .mote,
  html:not([data-cinematic="on"]) .cr-strobe,
  html:not([data-cinematic="on"]) .hud-chip.live,
  html:not([data-cinematic="on"]) .clr-seal { animation: none !important; }
}

@media (max-width: 900px) {
  .slot { width: 33.33%; }
  .slot:nth-child(n+4) { display: none; }
}
</style>
