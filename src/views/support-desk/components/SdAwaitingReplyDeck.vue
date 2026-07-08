<template>
  <div class="ard" ref="rootRef" :class="{ imminent: imminent > 0, reduced: red }" :style="{ '--ard-h': height + 'px' }">
    <!-- luminous, theme-adaptive vitrine (NOT a dark obsidian panel) -->
    <span class="ard-tag sd-mono"><MessageSquareText :size="11" /> AWAITING REPLY</span>
    <span class="ard-tick t-tl" /><span class="ard-tick t-tr" /><span class="ard-tick t-bl" /><span class="ard-tick t-br" />

    <!-- ambient depth: drifting bokeh + a faint conversation thread -->
    <div class="ard-atm" aria-hidden="true"><span class="bok b1" /><span class="bok b2" /><span class="bok b3" /><span class="bok b4" /></div>
    <svg class="ard-thread" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">
      <path d="M92,96 C150,120 150,150 214,170 C270,188 250,214 300,232" />
    </svg>

    <!-- depth-of-field conversation stack: two blurred ghosts behind the crisp featured capsule -->
    <div class="cap ghost g-back" aria-hidden="true">
      <span class="cap-av" /><span class="cap-lines"><i /><i class="s" /></span>
    </div>
    <div class="cap ghost g-mid" aria-hidden="true">
      <span class="cap-av" /><span class="cap-lines"><i /><i class="s" /></span>
    </div>

    <!-- featured capsule (crisp) — the ticket currently waiting on the customer -->
    <Motion as="div" class="cap front" :class="'tone-' + front.tone"
      :initial="{ opacity: 0, y: 16, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
      :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }" :whileHover="{ y: -3 }">
      <div class="cap-top">
        <span class="cap-avatar"><UserRound :size="13" /></span>
        <div class="cap-id">
          <span class="cap-ticket sd-mono">{{ front.ref }}</span>
          <span class="cap-delivered sd-mono"><CheckCheck :size="12" /> delivered</span>
        </div>
        <span class="cap-silence sd-mono"><Clock3 :size="11" /> {{ oldestLabel }}</span>
      </div>
      <Motion as="div" class="cap-body" :key="cycle"
        :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45 }">
        <span class="cap-title">{{ front.title }}</span>
        <span class="cap-meta">{{ front.meta }}</span>
      </Motion>
      <div class="cap-foot">
        <!-- endless "awaiting their reply" typing indicator (never resolves) -->
        <span v-if="front.mode === 'typing'" class="typing"><i /><i /><i /> <b>awaiting their reply</b></span>
        <span v-else-if="front.mode === 'nudged'" class="foot-chip"><BellRing :size="12" /> reminder sent</span>
        <span v-else class="foot-chip cold"><Flame :size="12" /> going cold</span>
      </div>
      <span class="cap-spine" />
    </Motion>

    <!-- reply arrives → emerald capsule flies off (reactivated) -->
    <Presence>
      <Motion v-if="replyPop" as="div" class="reply-pop"
        :initial="{ opacity: 0, x: 0, y: 0, scale: 0.82 }"
        :animate="{ opacity: 1, x: 74, y: -66, scale: 1.02 }"
        :exit="{ opacity: 0, x: 130, y: -110 }"
        :transition="{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }">
        <CornerUpLeft :size="13" /> <span>Reply received — reactivating</span>
      </Motion>
    </Presence>

    <!-- HUD readout -->
    <div class="ard-hud">
      <span class="hud-n"><SdCountUp :value="pending" /></span>
      <span class="hud-lbl">awaiting a reply</span>
      <div class="hud-chips">
        <span class="hud-chip danger" :class="{ live: imminent > 0 }"><Flame :size="10" /> <b>{{ imminent }}</b> auto-close &lt;24h</span>
        <span class="hud-chip good" :class="{ live: reactivatedToday > 0 }"><CornerUpLeft :size="10" /> <b>{{ reactivatedToday }}</b> came back</span>
      </div>
    </div>
  </div>
</template>

<script setup>
/*
  SdAwaitingReplyDeck — the "Pending Customer" signature instrument (motion study 03).
  A cinematic conversation deck: the ticket currently waiting on the customer sits as a crisp
  glass message capsule (delivered ✓✓ + an endless "awaiting their reply" typing indicator that
  never resolves), stacked over two depth-of-field ghost capsules and a drifting bokeh field.
  Every few beats a reply lands — an emerald "reactivating" capsule flies off — and the deck
  advances to the next waiting state. Crisp DOM text + real backdrop blur + spring motion (the
  premium way to render a chat metaphor), theme-adaptive vitrine (reads on cream), reduced-motion
  aware. Distinct from every sibling instrument (≠ sonar / pipeline / conveyor / gauge / globe / basin).
*/
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { MessageSquareText, UserRound, CheckCheck, Clock3, BellRing, Flame, CornerUpLeft } from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'

const props = defineProps({
  pending: { type: Number, default: 0 },
  oldestSilenceMs: { type: Number, default: 0 },
  imminent: { type: Number, default: 0 },
  reactivatedToday: { type: Number, default: 0 },
  height: { type: Number, default: 300 },
  reduced: { type: Boolean, default: false },
})

const rootRef = ref(null)
const cinematicOn = () => document.documentElement.getAttribute('data-cinematic') === 'on'
const red = ref(props.reduced || (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && !cinematicOn()))

const HOUR = 3600000, DAY = 86400000
const oldestLabel = computed(() => {
  const m = props.oldestSilenceMs
  if (!m || m < 60000) return 'quiet'
  if (m < HOUR) return `${Math.round(m / 60000)}m silent`
  if (m < DAY) return `${Math.round(m / HOUR)}h silent`
  return `${Math.round(m / DAY)}d silent`
})

/* the waiting states the featured capsule cycles through */
const STATES = [
  { title: 'Waiting on the customer', meta: 'We replied · they haven’t answered yet', mode: 'typing', tone: 'amber' },
  { title: 'Reminder sent', meta: 'Nudged the requester · still quiet', mode: 'nudged', tone: 'amber' },
  { title: 'Going cold', meta: 'No word in days · nearing auto-close', mode: 'cold', tone: 'cold' },
]
const cycle = ref(0)
const front = computed(() => {
  const s = STATES[cycle.value % STATES.length]
  const tone = s.mode === 'cold' && props.imminent > 0 ? 'danger' : s.tone
  const ref_ = `#TKT-${String(4100 + (cycle.value * 7) % 900).padStart(4, '0')}`
  return { ...s, tone, ref: ref_ }
})

/* reply-arrives loop → emerald fly-off + advance the deck */
const replyPop = ref(false)
let popT = null, advT = null
const cadence = computed(() => Math.max(3200, 6000 - Math.min(props.reactivatedToday, 6) * 500))
function beat() {
  if (red.value) return
  replyPop.value = true
  popT = setTimeout(() => { replyPop.value = false; cycle.value++ }, 1000)
}
onMounted(() => { if (!red.value) advT = setInterval(beat, cadence.value) })
onBeforeUnmount(() => { clearTimeout(popT); clearInterval(advT) })
</script>

<style scoped>
.ard {
  --ard-glass: rgba(255, 246, 232, 0.06); --ard-edge: rgba(255, 220, 160, 0.22);
  position: relative; width: 100%; height: var(--ard-h, 300px); border-radius: 20px; overflow: hidden;
  background:
    radial-gradient(120% 92% at 50% 8%, rgba(84, 60, 32, 0.5), transparent 62%),
    radial-gradient(140% 120% at 50% 120%, rgba(251, 146, 60, 0.14), transparent 60%),
    linear-gradient(180deg, rgba(38, 30, 22, 0.9), rgba(20, 16, 12, 0.94));
  border: 1px solid var(--sd-amber-border); box-shadow: inset 0 1px 0 rgba(255, 240, 214, 0.12), 0 20px 46px rgba(0, 0, 0, 0.4);
}
[data-theme="light"] .ard {
  --ard-glass: rgba(255, 250, 240, 0.72); --ard-edge: rgba(176, 109, 36, 0.3);
  background:
    radial-gradient(120% 92% at 50% 6%, #fdf6ea, transparent 60%),
    radial-gradient(140% 120% at 50% 122%, rgba(234, 88, 12, 0.1), transparent 58%),
    linear-gradient(180deg, #fbf4e6, #f1e6d2);
  border-color: rgba(176, 109, 36, 0.32); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7), inset 0 0 44px rgba(176, 109, 36, 0.08), 0 16px 40px rgba(120, 80, 30, 0.14);
}

.ard-tag { position: absolute; top: 11px; left: 13px; z-index: 6; display: inline-flex; align-items: center; gap: 6px; font-size: 9px; font-weight: 700; letter-spacing: 0.18em; color: var(--sd-amber); opacity: 0.82; }
[data-theme="light"] .ard-tag { color: #9a5a12; }
.ard-tick { position: absolute; width: 12px; height: 12px; z-index: 6; border: 1.4px solid var(--sd-amber-border); opacity: 0.6; }
.t-tl { top: 9px; left: 9px; border-right: none; border-bottom: none; }
.t-tr { top: 9px; right: 9px; border-left: none; border-bottom: none; }
.t-bl { bottom: 9px; left: 9px; border-right: none; border-top: none; }
.t-br { bottom: 9px; right: 9px; border-left: none; border-top: none; }

/* ambient bokeh + thread */
.ard-atm { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
.bok { position: absolute; border-radius: 50%; filter: blur(30px); opacity: 0.5; will-change: transform; }
.bok.b1 { width: 150px; height: 150px; top: -30px; left: 8%; background: radial-gradient(circle, rgba(251, 191, 36, 0.4), transparent 68%); animation: ard-drift 17s ease-in-out infinite; }
.bok.b2 { width: 120px; height: 120px; top: 30%; right: 6%; background: radial-gradient(circle, rgba(251, 146, 60, 0.34), transparent 68%); animation: ard-drift 22s ease-in-out infinite reverse; }
.bok.b3 { width: 100px; height: 100px; bottom: -20px; left: 30%; background: radial-gradient(circle, rgba(234, 88, 12, 0.3), transparent 68%); animation: ard-drift 26s ease-in-out infinite; }
.bok.b4 { width: 90px; height: 90px; top: 12%; left: 44%; background: radial-gradient(circle, rgba(52, 211, 153, 0.14), transparent 68%); animation: ard-drift 30s ease-in-out infinite reverse; }
[data-theme="light"] .bok { opacity: 0.38; }
.ard-thread { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; pointer-events: none; }
.ard-thread path { fill: none; stroke: var(--sd-amber-border); stroke-width: 1.2; stroke-dasharray: 4 7; opacity: 0.6; animation: ard-flow 3s linear infinite; }

/* capsules */
.cap { position: absolute; border-radius: 15px; background: var(--ard-glass); border: 1px solid var(--ard-edge);
  -webkit-backdrop-filter: blur(9px); backdrop-filter: blur(9px); box-shadow: 0 14px 34px rgba(0, 0, 0, 0.34); }
[data-theme="light"] .cap { box-shadow: 0 12px 28px rgba(120, 80, 30, 0.14); }
.cap.ghost { z-index: 2; display: flex; align-items: center; gap: 9px; padding: 11px 13px; width: 205px; }
.cap.ghost .cap-av { width: 26px; height: 26px; border-radius: 9px; background: color-mix(in srgb, var(--sd-amber) 22%, transparent); flex-shrink: 0; }
.cap.ghost .cap-lines { display: flex; flex-direction: column; gap: 6px; flex: 1; }
.cap.ghost .cap-lines i { height: 6px; border-radius: 3px; background: color-mix(in srgb, var(--sd-text) 22%, transparent); }
.cap.ghost .cap-lines i.s { width: 60%; }
.g-back { top: 40px; left: 30px; transform: scale(0.86); filter: blur(3px); opacity: 0.42; animation: ard-float 9s ease-in-out infinite; }
.g-mid { top: 74px; left: 66px; transform: scale(0.94); filter: blur(1.4px); opacity: 0.66; animation: ard-float 7.5s ease-in-out infinite reverse; }

.cap.front { z-index: 4; left: 50%; top: 44%; width: min(280px, 74%); transform: translate(-46%, -50%);
  display: flex; flex-direction: column; gap: 9px; padding: 14px 15px 13px; overflow: hidden; animation: ard-float 8s ease-in-out infinite; }
.cap-spine { position: absolute; left: 0; top: 12px; bottom: 12px; width: 3px; border-radius: 3px; background: var(--sd-amber); }
.tone-amber .cap-spine { background: var(--sd-amber); }
.tone-cold .cap-spine { background: var(--sd-ember); }
.tone-danger .cap-spine { background: var(--sd-danger); }
.cap-top { display: flex; align-items: center; gap: 9px; }
.cap-avatar { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 10px; flex-shrink: 0;
  color: #22160a; background: linear-gradient(135deg, #fcd34d, #fb923c); }
[data-theme="light"] .cap-avatar { color: #fff8ec; }
.cap-id { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.cap-ticket { font-size: 12px; font-weight: 800; color: var(--sd-text); letter-spacing: 0.02em; }
.cap-delivered { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; color: var(--sd-success); }
.cap-silence { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; color: var(--sd-text-muted); flex-shrink: 0; }
.cap-body { display: flex; flex-direction: column; gap: 3px; }
.cap-title { font-size: 14px; font-weight: 700; color: var(--sd-text); letter-spacing: -0.01em; }
.cap-meta { font-size: 11px; color: var(--sd-text-secondary); line-height: 1.4; }
.cap-foot { display: flex; align-items: center; }
.typing { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; color: var(--sd-text-muted); }
.typing b { font-weight: 600; font-style: normal; margin-left: 4px; color: var(--sd-amber); }
.typing i { width: 5px; height: 5px; border-radius: 50%; background: var(--sd-amber); display: inline-block; animation: ard-type 1.4s ease-in-out infinite; }
.typing i:nth-child(2) { animation-delay: 0.2s; } .typing i:nth-child(3) { animation-delay: 0.4s; }
.foot-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 600; color: var(--sd-amber); padding: 3px 9px; border-radius: 999px; background: color-mix(in srgb, var(--sd-amber) 12%, transparent); border: 1px solid color-mix(in srgb, var(--sd-amber) 26%, transparent); }
.foot-chip.cold { color: var(--sd-ember); background: color-mix(in srgb, var(--sd-ember) 12%, transparent); border-color: color-mix(in srgb, var(--sd-ember) 28%, transparent); }
.tone-danger .foot-chip.cold { color: var(--sd-danger); background: color-mix(in srgb, var(--sd-danger) 12%, transparent); border-color: color-mix(in srgb, var(--sd-danger) 30%, transparent); }

.reply-pop { position: absolute; z-index: 5; left: 50%; top: 42%; transform: translate(-50%, -50%);
  display: inline-flex; align-items: center; gap: 7px; padding: 9px 13px; border-radius: 12px; font-size: 11.5px; font-weight: 700; white-space: nowrap;
  color: #06281c; background: linear-gradient(135deg, #6ee7b7, #34d399); box-shadow: 0 12px 30px color-mix(in srgb, var(--sd-success) 40%, transparent); }
[data-theme="light"] .reply-pop { color: #043024; }

/* HUD */
.ard-hud { position: absolute; left: 0; right: 0; bottom: 12px; z-index: 6; display: flex; flex-direction: column; align-items: center; gap: 5px; pointer-events: none; }
.hud-n { font-size: 26px; font-weight: 850; color: var(--sd-text); letter-spacing: -0.02em; line-height: 1; text-shadow: 0 2px 12px rgba(0, 0, 0, 0.4); }
[data-theme="light"] .hud-n { text-shadow: 0 1px 2px rgba(255, 255, 255, 0.7); }
.hud-lbl { font-size: 9px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--sd-text-muted); }
.hud-chips { display: inline-flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin-top: 2px; }
.hud-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 999px; font-size: 9.5px; color: var(--sd-text-secondary);
  background: color-mix(in srgb, var(--sd-canvas) 62%, transparent); border: 1px solid var(--sd-border); }
.hud-chip b { font-family: var(--sd-mono); font-weight: 800; }
.hud-chip.danger { color: var(--sd-danger); border-color: color-mix(in srgb, var(--sd-danger) 32%, transparent); }
.hud-chip.good { color: var(--sd-success); border-color: color-mix(in srgb, var(--sd-success) 30%, transparent); }
.hud-chip.live { animation: ard-blip 2.2s ease-in-out infinite; }

@keyframes ard-drift { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(20px, -16px); } }
@keyframes ard-float { 0%, 100% { transform: translate(-46%, -50%) translateY(0); } 50% { transform: translate(-46%, -50%) translateY(-6px); } }
.g-back { animation-name: ard-float-g; } .g-mid { animation-name: ard-float-g2; }
@keyframes ard-float-g { 0%, 100% { transform: scale(0.86) translateY(0); } 50% { transform: scale(0.86) translateY(-7px); } }
@keyframes ard-float-g2 { 0%, 100% { transform: scale(0.94) translateY(0); } 50% { transform: scale(0.94) translateY(6px); } }
@keyframes ard-type { 0%, 60%, 100% { transform: translateY(0); opacity: 0.5; } 30% { transform: translateY(-4px); opacity: 1; } }
@keyframes ard-flow { to { stroke-dashoffset: -22; } }
@keyframes ard-blip { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

.ard.reduced .bok, .ard.reduced .cap, .ard.reduced .typing i, .ard.reduced .ard-thread path, .ard.reduced .hud-chip.live { animation: none !important; }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .bok,
  html:not([data-cinematic="on"]) .cap,
  html:not([data-cinematic="on"]) .typing i,
  html:not([data-cinematic="on"]) .ard-thread path,
  html:not([data-cinematic="on"]) .hud-chip.live { animation: none !important; }
}
</style>
