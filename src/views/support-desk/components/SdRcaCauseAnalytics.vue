<template>
  <!-- ═══ RISK & MARGIN — four analytics desks (theme-native cards, bronze accents).
       Cause mix · breach-reason book · clearing speed · follow-through + debt aging. ═══ -->
  <section class="rca-an">
    <header class="an-bar">
      <span class="an-name sd-mono">RISK &amp; MARGIN — CAUSE ANALYTICS</span>
      <span class="an-note sd-mono">ROLLING 90 DAYS · ALL DESKS</span>
    </header>

    <div class="an-grid" :class="{ 'is-loading': loading }">
      <!-- (a) CAUSE MIX -->
      <article class="an-panel">
        <p class="an-eyebrow sd-mono">CAUSE MIX — ROOT-CAUSE BOOK</p>
        <template v-if="causeMix.length">
          <div v-for="m in causeMix" :key="m.key" class="mix-row sd-mono">
            <span class="nm">{{ m.key }}</span>
            <span class="mix-track"><i class="mix-fill" :style="{ width: revealed ? `${m.pct}%` : '0%' }" /></span>
            <span class="ct">{{ m.count }}</span>
          </div>
        </template>
        <template v-else>
          <div v-for="n in 4" :key="n" class="mix-row sd-mono zero">
            <span class="nm">—</span><span class="mix-track" /><span class="ct">0</span>
          </div>
        </template>
      </article>

      <!-- (b) BREACH-REASON BOOK -->
      <article class="an-panel">
        <p class="an-eyebrow sd-mono">BREACH-REASON BOOK</p>
        <div v-if="breachMix.length" class="breach-strip" aria-hidden="true">
          <i v-for="(b, i) in breachMix" :key="b.key" :style="{ flex: b.count, opacity: 1 - i * 0.14 }" />
        </div>
        <div v-else class="breach-strip zero" aria-hidden="true" />
        <template v-if="breachMix.length">
          <div v-for="b in breachMix" :key="b.key" class="mix-row sd-mono">
            <span class="nm">{{ b.key }}</span>
            <span class="mix-track"><i class="mix-fill warm" :style="{ width: revealed ? `${b.pct}%` : '0%' }" /></span>
            <span class="ct">{{ b.count }}</span>
          </div>
        </template>
        <p v-else class="an-zero sd-mono">NO BREACH REASONS ANNOTATED IN THE WINDOW.</p>
      </article>

      <!-- (c) CLEARING SPEED -->
      <article class="an-panel">
        <p class="an-eyebrow sd-mono">CLEARING SPEED — TEMPO</p>
        <div class="tempo">
          <div class="tempo-big sd-mono"><b>{{ fmtH(cycle.median_hours) }}</b><span>RESOLVE → FILED · MEDIAN</span></div>
          <div class="gauge">
            <span class="g-lbl sd-mono">MED</span>
            <span class="g-track"><i :style="{ width: revealed ? `${pctOf(cycle.median_hours, cycle.p90_hours)}%` : '0%' }" /></span>
            <span class="g-cap sd-mono">P90 {{ fmtH(cycle.p90_hours) }}</span>
          </div>
          <div class="tempo-big sd-mono second"><b>{{ fmtH(latency.median_hours) }}</b><span>FILED → VERDICT · MEDIAN</span></div>
          <div class="gauge">
            <span class="g-lbl sd-mono">MED</span>
            <span class="g-track"><i class="lat" :style="{ width: revealed ? `${pctOf(latency.median_hours, latency.p90_hours)}%` : '0%' }" /></span>
            <span class="g-cap sd-mono">P90 {{ fmtH(latency.p90_hours) }}</span>
          </div>
          <p class="tempo-n sd-mono">SAMPLE n = {{ cycle.n ?? 0 }} FILINGS · {{ latency.n ?? cycle.n ?? 0 }} VERDICTS</p>
        </div>
      </article>

      <!-- (d) FOLLOW-THROUGH + DEBT AGING -->
      <article class="an-panel">
        <p class="an-eyebrow sd-mono">FOLLOW-THROUGH · AGED RECEIVABLES</p>
        <div class="ft-split">
          <div class="ft-ring">
            <svg viewBox="0 0 64 64" aria-hidden="true">
              <circle class="ring-bg" cx="32" cy="32" r="26" />
              <circle class="ring-fg" cx="32" cy="32" r="26"
                :stroke-dasharray="CIRC" :stroke-dashoffset="revealed ? ringOffset : CIRC" />
            </svg>
            <div class="ring-txt sd-mono"><b>{{ donePct }}%</b><span>ACTIONS DONE</span></div>
          </div>
          <div class="ft-meta sd-mono">
            <span><b>{{ follow.done ?? 0 }}</b> CLOSED</span>
            <span><b>{{ follow.open ?? 0 }}</b> OPEN</span>
            <span class="over" :class="{ hot: (follow.overdue ?? 0) > 0 }"><b>{{ follow.overdue ?? 0 }}</b> OVERDUE</span>
          </div>
        </div>
        <button class="ladder" type="button" title="Open the owed lens" @click="$emit('lens', 'owed')">
          <span v-for="rung in ladder" :key="rung.key" class="rung" :class="{ crit: rung.crit && rung.count > 0 }">
            <span class="lbl sd-mono">{{ rung.label }}</span>
            <span class="rung-track"><i :style="{ width: revealed ? `${rung.pct}%` : '0%' }" /></span>
            <span class="ct sd-mono">{{ rung.count }}</span>
          </span>
          <span class="ladder-note sd-mono">RCA DEBT LADDER — CLICK TO PULL THE OWED BOOK</span>
        </button>
      </article>
    </div>
  </section>
</template>

<script setup>
/*
  SdRcaCauseAnalytics — the Clearinghouse RISK & MARGIN row. Pure projection of the
  /incidents/rca/analytics packet + the board's lockstep debt aging; the only intent
  it emits is lens('owed') from the debt ladder.
*/
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  analytics: { type: Object, default: null },
  aging: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  reduced: { type: Boolean, default: false },
})
defineEmits(['lens'])

const CIRC = 2 * Math.PI * 26

/* ── mixes ── */
const shapeMix = (list) => {
  const sorted = [...(list || [])].sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, 6)
  const max = Math.max(1, ...sorted.map((m) => m.count || 0))
  return sorted.map((m) => ({
    key: String(m.key || 'other').replace(/_/g, ' '),
    count: m.count || 0,
    pct: Math.round(((m.count || 0) / max) * 100),
  }))
}
const causeMix = computed(() => shapeMix(props.analytics?.category_mix))
const breachMix = computed(() => shapeMix(props.analytics?.breach_reason_mix))

/* ── tempo ── */
const cycle = computed(() => props.analytics?.cycle_time || {})
const latency = computed(() => props.analytics?.review_latency || {})
const pctOf = (med, p90) => (Number(p90) > 0 ? Math.min(100, Math.round((Number(med || 0) / Number(p90)) * 100)) : 0)
const fmtH = (h) => {
  const v = Number(h || 0)
  return v >= 48 ? `${(v / 24).toFixed(1)}d` : `${v.toFixed(1)}h`
}

/* ── follow-through ring ── */
const follow = computed(() => props.analytics?.actions_follow_through || {})
const donePct = computed(() => Math.round(Number(follow.value.done_pct ?? 0)))
const ringOffset = computed(() => CIRC * (1 - Math.min(100, donePct.value) / 100))

/* ── debt aging ladder (board-lockstep aging block) ── */
const ladder = computed(() => {
  const a = props.aging || {}
  const buckets = [
    { key: 'd0_3', label: '0–3d', count: a.d0_3 ?? 0 },
    { key: 'd3_7', label: '3–7d', count: a.d3_7 ?? 0 },
    { key: 'd7_14', label: '7–14d', count: a.d7_14 ?? 0 },
    { key: 'd14_plus', label: '14d+', count: a.d14_plus ?? 0, crit: true },
  ]
  const max = Math.max(1, ...buckets.map((b) => b.count))
  return buckets.map((b) => ({ ...b, pct: Math.round((b.count / max) * 100) }))
})

/* ── draw-in on reveal ── */
const revealed = ref(false)
onMounted(() => {
  if (props.reduced) { revealed.value = true; return }
  requestAnimationFrame(() => requestAnimationFrame(() => { revealed.value = true }))
})
</script>

<style scoped>
.rca-an { display: flex; flex-direction: column; gap: 12px; }
.an-bar { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap;
  gap: 8px; border-bottom: 1px solid var(--sd-rcg-brd); padding-bottom: 9px; }
.an-name { font-size: 10.5px; letter-spacing: 0.28em; font-weight: 700; color: var(--sd-rcg-core); }
.an-note { font-size: 8.5px; letter-spacing: 0.12em; color: var(--sd-text-muted); }
.an-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.an-grid.is-loading { opacity: 0.6; }
.an-panel { border-radius: 14px; padding: 14px 15px 16px; min-width: 0;
  background: var(--sd-surface); border: 1px solid var(--sd-border);
  transition: transform 0.25s var(--sd-spring), border-color 0.25s; }
.an-panel:hover { transform: translateY(-3px); border-color: var(--sd-rcg-brd); }
.an-eyebrow { margin: 0 0 11px; font-size: 8.5px; letter-spacing: 0.26em; font-weight: 800;
  color: var(--sd-rcg-core); }
.an-zero { margin: 6px 0 0; font-size: 8.5px; letter-spacing: 0.1em; color: var(--sd-text-muted); }

/* mix rows */
.mix-row { display: grid; grid-template-columns: 86px 1fr 26px; gap: 9px; align-items: center;
  margin-bottom: 8px; font-size: 9.5px; font-variant-numeric: tabular-nums; }
.mix-row .nm { color: var(--sd-text-secondary); letter-spacing: 0.08em; text-transform: uppercase;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mix-track { height: 11px; border-radius: 3px; overflow: hidden; background: var(--sd-rcg-soft); }
.mix-fill { display: block; height: 100%; border-radius: 3px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--sd-rcg-core) 45%, transparent), var(--sd-rcg-core));
  transition: width 1.2s var(--sd-spring) 0.2s; }
.mix-fill.warm { background: linear-gradient(90deg, color-mix(in srgb, var(--sd-rcg-warn) 40%, transparent), var(--sd-rcg-warn)); }
.mix-row .ct { color: var(--sd-text); text-align: right; font-size: 10.5px; }
.mix-row.zero .nm, .mix-row.zero .ct { opacity: 0.45; }
.mix-row.zero .mix-track { border: 1px dashed var(--sd-rcg-brd); background: transparent; }

/* breach strip */
.breach-strip { display: flex; gap: 1px; height: 12px; border-radius: 3px; overflow: hidden; margin: 0 0 10px; }
.breach-strip i { background: var(--sd-rcg-warn); }
.breach-strip.zero { border: 1px dashed var(--sd-rcg-brd); }

/* tempo */
.tempo-big { display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; }
.tempo-big.second { margin-top: 14px; }
.tempo-big b { font-size: 30px; font-weight: 200; color: var(--sd-text); font-variant-numeric: tabular-nums; }
.tempo-big span { font-size: 8px; color: var(--sd-text-muted); letter-spacing: 0.12em; }
.gauge { display: grid; grid-template-columns: 30px 1fr auto; gap: 8px; align-items: center; }
.g-lbl { font-size: 7.5px; letter-spacing: 0.14em; color: var(--sd-text-muted); }
.g-track { height: 7px; border-radius: 4px; overflow: hidden; background: var(--sd-rcg-soft); }
.g-track i { display: block; height: 100%; border-radius: 4px;
  background: linear-gradient(90deg, var(--sd-rcg-core), var(--sd-rcg-hi));
  transition: width 1.3s var(--sd-spring) 0.25s; }
.g-track i.lat { background: linear-gradient(90deg, var(--sd-rcg-settle), color-mix(in srgb, var(--sd-rcg-settle) 55%, var(--sd-rcg-hi))); }
.g-cap { font-size: 8.5px; letter-spacing: 0.08em; color: var(--sd-rcg-bounce); font-variant-numeric: tabular-nums; }
.tempo-n { margin: 12px 0 0; font-size: 8px; letter-spacing: 0.1em; color: var(--sd-text-muted); }

/* follow-through ring + ladder */
.ft-split { display: flex; align-items: center; gap: 14px; margin-bottom: 12px; }
.ft-ring { position: relative; width: 84px; height: 84px; flex: 0 0 auto; }
.ft-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.ring-bg { fill: none; stroke: var(--sd-rcg-soft); stroke-width: 6; }
.ring-fg { fill: none; stroke: var(--sd-rcg-settle); stroke-width: 6; stroke-linecap: round;
  transition: stroke-dashoffset 1.4s var(--sd-spring) 0.3s; }
.ring-txt { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; }
.ring-txt b { font-size: 15px; font-weight: 800; color: var(--sd-text); font-variant-numeric: tabular-nums; }
.ring-txt span { font-size: 6.5px; letter-spacing: 0.14em; color: var(--sd-text-muted); }
.ft-meta { display: flex; flex-direction: column; gap: 5px; font-size: 8.5px; letter-spacing: 0.1em;
  color: var(--sd-text-muted); }
.ft-meta b { color: var(--sd-text); font-size: 12px; margin-right: 4px; font-variant-numeric: tabular-nums; }
.ft-meta .over.hot, .ft-meta .over.hot b { color: var(--sd-rcg-bounce); }

.ladder { display: flex; flex-direction: column; gap: 8px; width: 100%; padding: 10px 10px 9px;
  border-radius: 10px; cursor: pointer; text-align: left; background: transparent;
  border: 1px dashed var(--sd-rcg-brd); transition: background 0.2s, border-color 0.2s; }
.ladder:hover { background: var(--sd-rcg-soft); border-color: var(--sd-rcg-core); }
.rung { display: grid; grid-template-columns: 42px 1fr 26px; gap: 8px; align-items: center; }
.rung .lbl { font-size: 8.5px; letter-spacing: 0.1em; color: var(--sd-text-muted); }
.rung-track { height: 12px; border-radius: 3px; overflow: hidden; background: var(--sd-rcg-soft); }
.rung-track i { display: block; height: 100%; border-radius: 3px;
  background: linear-gradient(90deg, var(--sd-rcg-deep), var(--sd-rcg-core));
  transition: width 1.1s var(--sd-spring) 0.3s; }
.rung .ct { font-size: 11px; color: var(--sd-text); text-align: right; font-variant-numeric: tabular-nums; }
.rung.crit .ct { color: var(--sd-rcg-bounce); font-weight: 800; }
.rung.crit .rung-track i { background: linear-gradient(90deg, var(--sd-rcg-bounce), color-mix(in srgb, var(--sd-rcg-bounce) 65%, var(--sd-rcg-warn)));
  animation: rung-heat 2.2s ease-in-out infinite; }
@keyframes rung-heat { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.5); } }
.ladder-note { font-size: 7.5px; letter-spacing: 0.14em; color: var(--sd-text-muted); }

@media (max-width: 1180px) { .an-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 680px) { .an-grid { grid-template-columns: 1fr; } }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .an-panel { transition: none; }
  html:not([data-cinematic="on"]) .mix-fill,
  html:not([data-cinematic="on"]) .g-track i,
  html:not([data-cinematic="on"]) .ring-fg,
  html:not([data-cinematic="on"]) .rung-track i { transition: none; }
  html:not([data-cinematic="on"]) .rung.crit .rung-track i { animation: none !important; }
}
</style>
