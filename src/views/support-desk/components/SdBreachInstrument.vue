<template>
  <div class="tdm" :style="{ height: height ? height + 'px' : '100%' }" role="img"
    aria-label="Time-Debt Meter — total minutes past SLA target, accruing live, with the worst debtors ledger">
    <!-- vault ambience: ledger rules + aura + drifting debt motes -->
    <div class="tdm-rules" aria-hidden="true" />
    <div class="tdm-aura" aria-hidden="true" />
    <div v-if="!reduced" class="tdm-motes" aria-hidden="true">
      <span v-for="n in 14" :key="n" class="tdm-mote" :style="moteStyle(n)" />
    </div>

    <!-- ── the meter (right stage; console owns the calm left air) ── -->
    <div class="tdm-stage">
      <div class="tdm-meter">
        <div class="tdm-cap sd-mono">
          <span>TEAM TIME-DEBT · MINUTES PAST TARGET</span>
          <span class="tdm-live" :class="{ hot: burnRate > 0 }">
            <i aria-hidden="true" />{{ burnRate > 0 ? 'ACCRUING' : 'HOLDING' }}
          </span>
        </div>

        <div class="tdm-odo" :class="{ hot: burnRate > 0 }">
          <template v-for="(d, i) in digitCells" :key="i">
            <span v-if="d === ','" class="tdm-sep sd-mono">,</span>
            <span v-else class="tdm-digit" :class="{ lit: d.lit }">
              <span class="tdm-reel" :style="{ transform: `translateY(${-d.v * 100}%)` }">
                <span v-for="k in 10" :key="k" class="tdm-cell sd-mono">{{ k - 1 }}</span>
              </span>
              <i class="tdm-hair" aria-hidden="true" />
            </span>
          </template>
        </div>

        <div class="tdm-under sd-mono">
          <span class="tdm-rate" :class="{ on: burnRate > 0 }">+{{ burnRate }} min / min</span>
          <span class="tdm-eq">≈ {{ debtHuman }}</span>
          <span v-if="frozenCount" class="tdm-frozen" title="Paused breaches — clock frozen, debt not accruing">❄ {{ frozenCount }} frozen</span>
        </div>
      </div>

      <!-- ── worst-debtors ledger ── -->
      <div v-if="debtors.length" class="tdm-ledger">
        <div class="tdm-lcap sd-mono">WORST DEBTORS — INTEREST ACCRUING</div>
        <Motion v-for="(d, i) in debtors" :key="d.t.id" as="button" class="tdm-row"
          :initial="{ opacity: 0, x: 18 }" :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.45, delay: 0.5 + i * 0.09, ease: [0.16, 1, 0.3, 1] }"
          :while-hover="{ x: -4 }" :while-tap="{ scale: 0.985 }"
          :title="d.t.subject" @click="$emit('open', d.t)">
          <span class="tdm-r-no sd-mono">{{ d.t.ticket_number }}</span>
          <span class="tdm-r-mid">
            <span class="tdm-r-subj">{{ d.t.subject }}</span>
            <span class="tdm-r-bar"><i :style="{ width: d.share + '%' }" /></span>
          </span>
          <span class="tdm-r-who sd-mono">{{ d.t.assigned_agent_name || 'Unassigned' }}</span>
          <span class="tdm-r-owe sd-mono" :class="{ frozen: !!d.t.sla_paused_since }">
            {{ d.label }}
            <i v-if="d.ticked" class="tdm-tick sd-mono" aria-hidden="true">+1m</i>
          </span>
        </Motion>
      </div>
      <div v-else class="tdm-clear sd-mono">
        <span class="tdm-clear-ring" aria-hidden="true" />
        METER READS ZERO — NO ACTIVE DEBT
      </div>
    </div>
  </div>
</template>

<script setup>
/*
  SdBreachInstrument — "THE TIME-DEBT METER" (gallery pick 02/08), the Breached desk's
  signature. A giant rolling odometer of the team's total breach-minutes, computed
  PAUSE-AWARE from the working set every second (each active unpaused resolution breach
  adds a real minute per minute — no fake speed-up), plus a worst-debtors ledger whose
  rows pulse "+1m" as their own minute lands. Fills the hero as a full-bleed backdrop
  (height=0 → 100%); the left air stays calm for the glass console.
*/
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'

const props = defineProps({
  tickets: { type: Array, default: () => [] },   // working set (active breached, decorated)
  stats: { type: Object, default: () => ({}) },  // /me/tickets/breached/stats
  now: { type: Number, default: () => Date.now() },
  reduced: { type: Boolean, default: false },
  height: { type: Number, default: 0 },
})
defineEmits(['open'])

const ep = (v) => (v ? new Date(v).getTime() : 0)
const terminal = (t) => ['resolved', 'closed'].includes(t.status)
/* pause-aware overage minutes for one ticket (resolution target; frozen while paused) */
const overMin = (t) => {
  const due = ep(t.sla_resolution_breached ? t.resolution_due_at : (t.sla_response_breached ? t.response_due_at : null))
  if (!due) return 0
  const end = t.sla_resolution_breached
    ? (ep(t.resolved_at) || ep(t.sla_paused_since) || props.now)
    : (ep(t.first_responded_at) || ep(t.sla_paused_since) || props.now)
  return Math.max(0, Math.floor((end - due) / 60000))
}
const activeBreached = computed(() => props.tickets.filter(t => !terminal(t) && (t.sla_resolution_breached || t.sla_response_breached)))
/* honest live total: recomputed as `now` ticks, so the meter rolls in real time */
const debtNow = computed(() => {
  const client = activeBreached.value.reduce((a, t) => a + overMin(t), 0)
  // team debt can exceed the 100-row working set — never show LESS than the sealed rollup
  return Math.max(client, props.stats.total_debt_minutes || 0)
})
const burnRate = computed(() =>
  activeBreached.value.filter(t => t.sla_resolution_breached && !t.sla_paused_since && !t.resolved_at).length)
const frozenCount = computed(() => activeBreached.value.filter(t => !!t.sla_paused_since).length)
const debtHuman = computed(() => {
  const m = Math.round(display.value)
  if (m < 60) return `${m} minutes owed`
  if (m < 1440) return `${(m / 60).toFixed(1)} hours owed`
  return `${(m / 1440).toFixed(1)} days owed`
})

/* ── odometer: spring-in on mount, then live rolls ── */
const display = ref(0)
let raf = null
const animateTo = (target, dur = 2200) => {
  if (props.reduced || dur <= 0) { display.value = target; return }
  cancelAnimationFrame(raf)
  const from = display.value, t0 = performance.now()
  const step = (t) => {
    const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4)
    display.value = from + (target - from) * e
    if (p < 1) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
}
// First REAL value (stats/working set land async) gets the full cinematic count-up;
// every later change (a live minute landing) is a short roll so the reels click over.
let firstSpin = true
watch(debtNow, (v) => {
  animateTo(v, firstSpin ? 2200 : 500)
  if (v > 0) firstSpin = false
})
onMounted(() => { animateTo(debtNow.value); if (debtNow.value > 0) firstSpin = false })
onBeforeUnmount(() => cancelAnimationFrame(raf))

const DIGITS = 6
const digitCells = computed(() => {
  const str = String(Math.max(0, Math.floor(display.value))).padStart(DIGITS, '0').slice(-DIGITS)
  const out = []
  let seenNonZero = false
  for (let i = 0; i < DIGITS; i++) {
    if (i === DIGITS - 3) out.push(',')
    const v = +str[i]
    if (v > 0) seenNonZero = true
    out.push({ v, lit: seenNonZero || i >= DIGITS - 3 })
  }
  return out
})

/* ── worst debtors + interest ticks ── */
const prevOwe = new Map()
const tickedIds = ref(new Set())
const debtors = computed(() => {
  const rows = activeBreached.value
    .map(t => ({ t, o: overMin(t) }))
    .sort((a, b) => b.o - a.o)
    .slice(0, 5)
  const max = rows[0]?.o || 1
  return rows.map(({ t, o }) => ({
    t,
    share: Math.max(6, Math.round(100 * o / max)),
    label: o < 60 ? `${o}m` : o < 1440 ? `${Math.floor(o / 60)}h ${String(o % 60).padStart(2, '0')}m` : `${Math.floor(o / 1440)}d ${Math.floor((o % 1440) / 60)}h`,
    ticked: tickedIds.value.has(String(t.id)),
  }))
})
watch(() => props.now, () => {
  if (props.reduced) return
  const next = new Set()
  for (const t of activeBreached.value) {
    const id = String(t.id), o = overMin(t)
    if (prevOwe.has(id) && o > prevOwe.get(id)) next.add(id)   // this row's minute just landed
    prevOwe.set(id, o)
  }
  if (next.size) {
    tickedIds.value = next
    setTimeout(() => { tickedIds.value = new Set() }, 1400)
  }
})

/* ambient debt motes (deterministic layout — no Math.random in template) */
const moteStyle = (n) => {
  const l = 38 + ((n * 37) % 60)
  return {
    left: l + '%',
    animationDelay: ((n * 1.7) % 9).toFixed(1) + 's',
    animationDuration: (7 + (n % 5) * 1.8).toFixed(1) + 's',
    opacity: 0.25 + ((n * 13) % 40) / 100,
  }
}
</script>

<style scoped>
.tdm { position: relative; width: 100%; overflow: hidden; background: var(--sd-brc-deep-bg); }

/* ledger rules — the faint ruled-paper grid of an old debt book */
.tdm-rules { position: absolute; inset: 0; pointer-events: none; opacity: 0.55;
  background:
    repeating-linear-gradient(0deg, transparent 0 34px, rgba(220, 38, 38, 0.05) 34px 35px),
    repeating-linear-gradient(90deg, transparent 0 120px, rgba(234, 179, 8, 0.035) 120px 121px); }
.tdm-aura { position: absolute; right: -8%; top: -22%; width: 66%; height: 130%; pointer-events: none;
  background: radial-gradient(50% 42% at 62% 38%, rgba(220, 38, 38, 0.17), transparent 70%); }
[data-theme="light"] .tdm-aura { background: radial-gradient(50% 42% at 62% 38%, rgba(220, 38, 38, 0.13), transparent 70%); }

.tdm-motes { position: absolute; inset: 0; pointer-events: none; }
.tdm-mote { position: absolute; bottom: -6px; width: 3px; height: 3px; border-radius: 50%;
  background: var(--sd-brc-hi); animation: tdm-drift linear infinite; }
@keyframes tdm-drift { from { transform: translateY(0) scale(1); } to { transform: translateY(-560px) scale(0.3); opacity: 0; } }

/* stage anchored right — console owns the left air */
.tdm-stage { position: absolute; inset: 0; z-index: 1; display: flex; flex-direction: column; justify-content: center;
  align-items: flex-end; gap: 14px; padding: 22px clamp(16px, 3.2vw, 44px) 84px; }

.tdm-meter { width: min(560px, 92%); }
.tdm-cap { display: flex; justify-content: space-between; align-items: center; gap: 12px;
  font-size: 10px; font-weight: 800; letter-spacing: 0.2em; color: rgba(245, 238, 230, 0.62); }
.tdm-live { display: inline-flex; align-items: center; gap: 6px; color: var(--sd-brc-hi); letter-spacing: 0.16em; }
.tdm-live i { width: 7px; height: 7px; border-radius: 50%; background: var(--sd-brc-repair); }
.tdm-live.hot i { background: var(--sd-brc-hi); animation: tdm-blip 1.3s ease-out infinite; }
@keyframes tdm-blip { 0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.55); } 100% { box-shadow: 0 0 0 9px transparent; } }

/* ── the odometer ── */
.tdm-odo { display: flex; gap: clamp(5px, 0.7vw, 9px); align-items: stretch; margin-top: 12px; }
.tdm-digit { position: relative; flex: 1; max-width: 86px; aspect-ratio: 0.72; overflow: hidden; border-radius: 12px;
  background: linear-gradient(180deg, #1c0d0e, #120607 55%, #1a0b0c);
  border: 1px solid rgba(220, 38, 38, 0.28);
  box-shadow: inset 0 10px 22px rgba(0, 0, 0, 0.55), inset 0 -6px 14px rgba(220, 38, 38, 0.07), 0 8px 28px -14px rgba(220, 38, 38, 0.5); }
.tdm-reel { position: absolute; inset: 0; transition: transform 0.55s cubic-bezier(0.16, 1, 0.3, 1); will-change: transform; }
.tdm-cell { display: grid; place-items: center; width: 100%; height: 100%;
  font-size: clamp(30px, 3.6vw, 52px); font-weight: 800; color: rgba(245, 238, 230, 0.34);
  font-variant-numeric: tabular-nums; text-shadow: none; }
.tdm-digit.lit .tdm-cell { color: var(--sd-brc-hi); text-shadow: 0 0 26px rgba(220, 38, 38, 0.55); }
.tdm-hair { position: absolute; left: 8%; right: 8%; top: 50%; height: 1px; background: rgba(245, 238, 230, 0.1); }
.tdm-sep { align-self: center; font-size: clamp(24px, 2.6vw, 38px); font-weight: 800; color: rgba(245, 238, 230, 0.4); }

.tdm-under { display: flex; align-items: center; gap: 14px; margin-top: 10px; font-size: 11px; font-weight: 700; }
.tdm-rate { padding: 4px 10px; border-radius: 999px; letter-spacing: 0.1em;
  color: rgba(245, 238, 230, 0.55); border: 1px solid rgba(245, 238, 230, 0.14); }
.tdm-rate.on { color: var(--sd-brc-hi); border-color: rgba(220, 38, 38, 0.5); background: rgba(220, 38, 38, 0.1);
  animation: tdm-rate-throb 2.2s ease-in-out infinite; }
@keyframes tdm-rate-throb { 0%, 100% { box-shadow: 0 0 0 0 transparent; } 50% { box-shadow: 0 0 18px -4px rgba(220, 38, 38, 0.6); } }
.tdm-eq { color: rgba(245, 238, 230, 0.5); letter-spacing: 0.06em; }
.tdm-frozen { color: var(--sd-brc-brass); letter-spacing: 0.06em; }

/* ── worst-debtors ledger ── */
.tdm-ledger { width: min(560px, 92%); border: 1px solid rgba(220, 38, 38, 0.22); border-radius: 14px;
  background: rgba(13, 6, 7, 0.62); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  padding: 10px 12px 8px; }
.tdm-lcap { font-size: 9px; font-weight: 800; letter-spacing: 0.22em; color: var(--sd-brc-brass); margin: 2px 4px 7px; }
.tdm-row { display: grid; grid-template-columns: 74px minmax(0, 1fr) 92px 86px; gap: 10px; align-items: center;
  width: 100%; text-align: left; padding: 7px 6px; border: none; border-radius: 9px; cursor: pointer;
  background: transparent; font-family: inherit; transition: background 0.18s; }
.tdm-row + .tdm-row { border-top: 1px solid rgba(245, 238, 230, 0.06); }
.tdm-row:hover { background: rgba(220, 38, 38, 0.08); }
.tdm-r-no { font-size: 10.5px; font-weight: 800; color: var(--sd-brc-hi); }
.tdm-r-mid { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.tdm-r-subj { font-size: 12px; font-weight: 650; color: rgba(245, 238, 230, 0.9);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tdm-r-bar { position: relative; height: 4px; border-radius: 99px; background: rgba(245, 238, 230, 0.08); overflow: hidden; }
.tdm-r-bar i { position: absolute; inset: 0 auto 0 0; border-radius: 99px;
  background: linear-gradient(90deg, var(--sd-brc-brass), var(--sd-brc-core)); transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
.tdm-r-who { font-size: 10px; font-weight: 700; color: rgba(245, 238, 230, 0.5); text-align: right;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tdm-r-owe { position: relative; font-size: 12.5px; font-weight: 800; color: var(--sd-brc-hi); text-align: right;
  font-variant-numeric: tabular-nums; }
.tdm-r-owe.frozen { color: var(--sd-brc-brass); }
.tdm-tick { position: absolute; right: 0; top: -4px; font-size: 9px; font-weight: 800; font-style: normal;
  color: var(--sd-brc-brass); animation: tdm-fly 1.4s ease-out both; pointer-events: none; }
@keyframes tdm-fly { 0% { opacity: 0; transform: translateY(4px); } 18% { opacity: 1; } 100% { opacity: 0; transform: translateY(-18px); } }

.tdm-clear { display: inline-flex; align-items: center; gap: 12px; padding: 14px 18px; border-radius: 14px;
  border: 1px dashed rgba(52, 211, 153, 0.4); color: var(--sd-brc-repair); font-size: 11px; font-weight: 800; letter-spacing: 0.18em; }
.tdm-clear-ring { width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--sd-brc-repair);
  animation: tdm-clear-pulse 2.4s ease-out infinite; }
@keyframes tdm-clear-pulse { 0% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.4); } 100% { box-shadow: 0 0 0 10px transparent; } }

/* the vault stays dark in light mode (like the sibling instruments); only chrome adapts */
[data-theme="light"] .tdm-digit { border-color: rgba(220, 38, 38, 0.34); }

@media (max-width: 940px) {
  .tdm-stage { position: relative; align-items: stretch; padding: 18px 16px 16px; }
  .tdm-meter, .tdm-ledger { width: 100%; }
  .tdm-row { grid-template-columns: 66px minmax(0, 1fr) 78px; }
  .tdm-r-who { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .tdm-mote, html:not([data-cinematic="on"]) .tdm-live.hot i,
  html:not([data-cinematic="on"]) .tdm-rate.on, html:not([data-cinematic="on"]) .tdm-tick,
  html:not([data-cinematic="on"]) .tdm-clear-ring { animation: none; }
  html:not([data-cinematic="on"]) .tdm-reel { transition: none; }
}
</style>
