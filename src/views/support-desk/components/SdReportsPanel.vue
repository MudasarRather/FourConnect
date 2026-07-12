<template>
  <section class="rp sd-card" :class="{ live: hasStrain, compact }">
    <span class="rp-grain" aria-hidden="true" />
    <span class="rp-aura" aria-hidden="true" />

    <!-- ═══ header · reporting-line pulse ═══ -->
    <header class="rp-head">
      <div class="rp-title">
        <p class="rp-eyebrow"><span class="rp-pip" /> REPORTING LINE · MANAGER OVERSIGHT</p>
        <h3><UsersRound :size="17" /> My reports' <span class="rp-accent">workload</span></h3>
        <p class="rp-sub">Live support load for every agent who reports to you — across every team they work.
          Tap a station to isolate their tickets.</p>
      </div>

      <div v-if="totals" class="rp-gauges">
        <div v-for="g in headGauges" :key="g.key" class="rp-gauge" :class="[g.key, { hot: g.hot }]">
          <span class="rp-gring" :style="{ '--p': g.pct + '%' }">
            <b><SdCountUp :value="g.value" :duration="850" /></b>
          </span>
          <i>{{ g.label }}</i>
        </div>
        <Motion as="button" class="rp-refresh" :class="{ spin: loading }" title="Refresh reporting line"
          :while-hover="{ rotate: 90 }" :while-tap="{ scale: 0.9 }" @click="$emit('refresh')"><RefreshCw :size="14" /></Motion>
      </div>
    </header>

    <!-- ═══ loading / empty ═══ -->
    <div v-if="loading && !reports.length" class="rp-strip">
      <div v-for="n in 3" :key="'sk' + n" class="rp-skel"><span /></div>
    </div>
    <div v-else-if="!reports.length" class="rp-empty">
      <span class="rp-empty-ring"><UsersRound :size="20" /></span>
      <p>No direct reports on the desk.</p>
    </div>

    <!-- ═══ station strip ═══ -->
    <div v-else class="rp-strip">
      <button v-for="(r, i) in reports" :key="r.user_id"
        class="rp-card" :class="[toneOf(r), { on: String(selectedId) === String(r.user_id) }]"
        :style="{ '--i': i, '--p': loadPct(r) + '%' }"
        @pointermove="spot" @click="$emit('pick', r.user_id)">
        <span class="rp-glare" aria-hidden="true" />
        <span class="rp-scan" aria-hidden="true" />

        <!-- identity -->
        <div class="rp-who">
          <span class="rp-ring">
            <i class="rp-ava">{{ initials(r.name) }}</i>
            <em class="rp-dot" :data-s="r.status" :title="r.status" />
          </span>
          <span class="rp-idn">
            <b>{{ r.name }}</b>
            <i class="rp-tag">{{ r.breached ? 'Under strain' : r.critical ? 'Critical load' : r.open ? 'On the desk' : 'Clear' }}</i>
          </span>
          <span class="rp-load sd-mono" :title="`${r.open} open`"><SdCountUp :value="r.open" /></span>
        </div>

        <!-- stat cells -->
        <div class="rp-cells">
          <span v-for="c in cellsOf(r)" :key="c.key" class="rp-cell" :class="[c.key, { z: !c.v }]">
            <component :is="c.icon" :size="11" />
            <b><SdCountUp :value="c.v" :duration="800" /></b>
            <i>{{ c.label }}</i>
          </span>
        </div>

        <!-- composition strain meter -->
        <span class="rp-meter" :title="`${r.open} open · ${r.breached} breached · ${r.critical} critical`">
          <i class="ok" :style="{ flex: Math.max(r.open - r.breached - r.critical, 0) || (r.open ? 0 : 1) }" />
          <i class="hot" :style="{ flex: r.breached }" />
          <i class="crit" :style="{ flex: r.critical }" />
        </span>
      </button>
    </div>

    <!-- ═══ drill · one report's tickets ═══ -->
    <div v-if="alwaysTable || selectedId" class="rp-drill">
      <div class="rp-drill-head">
        <b class="sd-mono"><Layers :size="12" /> {{ selectedId ? selectedName() : 'ALL REPORTS' }}
          · {{ drillRows.length }} TICKET{{ drillRows.length === 1 ? '' : 'S' }}</b>
        <button v-if="selectedId" class="rp-clear sd-mono" @click="$emit('pick', null)"><X :size="11" /> Show all</button>
      </div>
      <SdTicketTable :rows="drillRows" :columns="COLS" :loading="drillLoading" :now="now"
        accent="var(--sd-team-core)"
        :empty="{ title: 'No tickets', blurb: 'This report has no tickets right now.' }" :empty-icon="UsersRound"
        @open="id => $emit('open', id)" />
    </div>
  </section>
</template>

<script setup>
/* SdReportsPanel — "THE OVERSIGHT DECK". A reporting-manager's console over
   /me/tickets/reports-overview: an aggregate reporting-line pulse (three conic gauges)
   + one animated STATION per direct report (pointer-tilt + spotlight glare, conic load
   ring, count-up stat cells, a composition strain meter, live scan sheen when hot),
   click-to-isolate that report's tickets. Shown for any manager — including one who ALSO
   sits on a support team. Parent owns data + drill loading. Accent = --sd-team-*. */
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { UsersRound, RefreshCw, X, Layers, Flame, Siren, Timer, CircleCheck } from 'lucide-vue-next'
import SdTicketTable from './SdTicketTable.vue'
import SdCountUp from './SdCountUp.vue'

const props = defineProps({
  reports: { type: Array, default: () => [] },
  totals: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  now: { type: Number, default: () => Date.now() },
  selectedId: { type: [String, null], default: null },
  drillRows: { type: Array, default: () => [] },
  drillLoading: { type: Boolean, default: false },
  alwaysTable: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },   // strip variant under a hero (no title/sub)
})
defineEmits(['pick', 'open', 'refresh'])

const COLS = ['flag', 'number', 'subject', 'priority', 'status', 'sla', 'updated']
const initials = (n) => (n || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
const selectedName = () => (props.reports.find(r => String(r.user_id) === String(props.selectedId))?.name) || 'Report'

const hasStrain = computed(() => (props.reports || []).some(r => r.breached || r.critical))
const maxOpen = computed(() => Math.max(1, ...(props.reports || []).map(r => r.open || 0)))
const loadPct = (r) => Math.round(100 * Math.min(1, (r.open || 0) / maxOpen.value))
const toneOf = (r) => (r.critical ? 'crit' : r.breached ? 'strain' : (r.open >= Math.max(3, maxOpen.value * 0.7)) ? 'busy' : 'sync')

const cellsOf = (r) => [
  { key: 'open', label: 'open', v: r.open || 0, icon: Layers },
  { key: 'hot', label: 'breached', v: r.breached || 0, icon: Flame },
  { key: 'crit', label: 'critical', v: r.critical || 0, icon: Siren },
  { key: 'due', label: 'due soon', v: r.due_soon || 0, icon: Timer },
  { key: 'ok', label: 'solved', v: r.resolved_today || 0, icon: CircleCheck },
]

const headGauges = computed(() => {
  const t = props.totals || {}
  const denom = Math.max(1, t.open || 0)
  return [
    { key: 'open', label: 'open', value: t.open || 0, pct: 100, hot: false },
    { key: 'hot', label: 'breached', value: t.breached || 0, pct: Math.round(100 * (t.breached || 0) / denom), hot: (t.breached || 0) > 0 },
    { key: 'crit', label: 'critical', value: t.critical || 0, pct: Math.round(100 * (t.critical || 0) / denom), hot: (t.critical || 0) > 0 },
  ]
})

const spot = (e) => {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', ((e.clientX - r.left) / r.width).toFixed(3))
  el.style.setProperty('--my', ((e.clientY - r.top) / r.height).toFixed(3))
}
</script>

<style scoped>
.rp { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 15px; padding: 18px 20px 20px; }
.rp-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.4; mix-blend-mode: overlay;
  background-image: radial-gradient(circle at 1px 1px, var(--sd-team-core) 0.5px, transparent 0);
  background-size: 4px 4px; -webkit-mask-image: radial-gradient(120% 80% at 80% -10%, #000, transparent 70%);
          mask-image: radial-gradient(120% 80% at 80% -10%, #000, transparent 70%); }
.rp-aura { position: absolute; top: -140px; right: -80px; width: 380px; height: 300px; pointer-events: none; z-index: 0;
  background: radial-gradient(circle, var(--sd-team-soft), transparent 68%); filter: blur(8px);
  animation: rp-drift 22s ease-in-out infinite; }
.rp::before { content: ''; position: absolute; inset: 0 0 auto; height: 2px; pointer-events: none; z-index: 2;
  background: linear-gradient(90deg, transparent, var(--sd-team-core), var(--sd-team-hi), transparent); opacity: 0.7; }
.rp.live::before { animation: rp-scanline 3.6s ease-in-out infinite; }
/* content sits above the decorative layers — but must NOT re-flow the absolute aura/grain
   (that was the giant empty glow block: .rp > * overrode their position:absolute). */
.rp > *:not(.rp-grain):not(.rp-aura) { position: relative; z-index: 1; }

/* ── compact strip variant (rendered UNDER the Squad Command hero — not a second hero) ── */
.rp.compact { padding: 13px 15px; gap: 11px; }
.rp.compact .rp-aura { display: none; }
.rp.compact .rp-title h3, .rp.compact .rp-sub { display: none; }
.rp.compact .rp-head { align-items: center; }
.rp.compact .rp-gring { width: 44px; height: 44px; }
.rp.compact .rp-gring b { font-size: 13px; }
.rp.compact .rp-card { flex-basis: clamp(210px, 22vw, 250px); padding: 12px 13px; gap: 9px; }
.rp.compact .rp-ring { width: 40px; height: 40px; flex-basis: 40px; }
.rp.compact .rp-ava { width: 33px; height: 33px; font-size: 11px; }
.rp.compact .rp-load { font-size: 19px; }

/* ── header ── */
.rp-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; flex-wrap: wrap; }
.rp-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: var(--sd-mono); font-size: 9.5px;
  font-weight: 800; letter-spacing: 0.2em; color: var(--sd-team-core); margin: 0 0 7px; }
.rp-pip { width: 7px; height: 7px; border-radius: 50%; background: var(--sd-team-core); box-shadow: 0 0 0 0 var(--sd-team-soft);
  animation: rp-ping 2s ease-out infinite; }
.rp-title h3 { display: flex; align-items: center; gap: 9px; margin: 0; font-size: 19px; font-weight: 800;
  letter-spacing: -0.01em; color: var(--sd-text); }
.rp-title h3 :deep(svg) { color: var(--sd-team-core); }
.rp-accent { background: linear-gradient(100deg, var(--sd-team-core), var(--sd-team-hi));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.rp-sub { margin: 6px 0 0; font-size: 12px; color: var(--sd-text-secondary); max-width: 58ch; }

.rp-gauges { display: inline-flex; align-items: center; gap: 12px; }
.rp-gauge { display: flex; flex-direction: column; align-items: center; gap: 5px; }
.rp-gring { position: relative; width: 52px; height: 52px; border-radius: 50%; display: grid; place-items: center;
  background: conic-gradient(var(--sd-team-core) var(--p, 0%), var(--sd-team-deep-soft) 0);
  transition: --p 1s var(--sd-ease, ease-out); }
.rp-gauge.hot .rp-gring { background: conic-gradient(var(--sd-team-strain) var(--p, 0%), var(--sd-team-deep-soft) 0); }
.rp-gauge.crit.hot .rp-gring { background: conic-gradient(var(--sd-pri-critical, #ef4444) var(--p, 0%), var(--sd-team-deep-soft) 0); }
.rp-gring::after { content: ''; position: absolute; inset: 4px; border-radius: 50%; background: var(--sd-surface); }
.rp-gring b { position: relative; z-index: 1; font-family: var(--sd-mono); font-size: 15px; font-weight: 800; color: var(--sd-text); }
.rp-gauge.hot .rp-gring b { color: var(--sd-team-strain); }
.rp-gauge.crit.hot .rp-gring b { color: var(--sd-pri-critical, #ef4444); }
.rp-gauge i { font-style: normal; font-size: 8px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--sd-text-dim); }
.rp-refresh { display: inline-grid; place-items: center; width: 34px; height: 34px; border-radius: 11px; cursor: pointer;
  border: 1px solid var(--sd-team-brd); background: var(--sd-team-soft); color: var(--sd-team-core); align-self: center; }
.rp-refresh.spin { animation: rp-spin 0.9s linear infinite; }

/* ── station strip ── */
.rp-strip { display: flex; gap: 13px; overflow-x: auto; padding: 3px 2px 8px; scrollbar-width: thin; }
.rp-card { position: relative; overflow: hidden; flex: 0 0 clamp(224px, 24vw, 268px);
  display: flex; flex-direction: column; gap: 11px; text-align: left; padding: 14px 15px; border-radius: 18px;
  cursor: pointer; font-family: inherit; color: var(--sd-text);
  background: linear-gradient(160deg, var(--sd-surface), color-mix(in srgb, var(--sd-team-soft) 40%, var(--sd-surface)));
  border: 1px solid var(--sd-border);
  transition: transform 0.24s var(--sd-spring), border-color 0.2s, box-shadow 0.28s;
  animation: rp-deal 0.5s var(--sd-spring) backwards; animation-delay: calc(var(--i) * 0.07s); }
.rp-card:hover { transform: perspective(1000px) rotateX(calc((var(--my, 0.5) - 0.5) * -5deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 7deg)) translateY(-4px); }
.rp-card:active { transform: scale(0.985); }
.rp-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--sd-team-sync); opacity: 0.9; }
.rp-card.busy::before { background: var(--sd-team-core); }
.rp-card.strain::before { background: var(--sd-team-strain); }
.rp-card.crit::before { background: var(--sd-pri-critical, #ef4444); }
.rp-card.on { border-color: var(--sd-team-core); box-shadow: 0 0 0 1px var(--sd-team-core), var(--sd-team-glow); }
.rp-card.crit, .rp-card.strain { border-color: color-mix(in srgb, var(--sd-team-strain) 40%, var(--sd-border)); }
.rp-glare { position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity 0.25s;
  background: radial-gradient(320px circle at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), var(--sd-team-hi-soft), transparent 60%); }
.rp-card:hover .rp-glare { opacity: 1; }
.rp-card:hover { border-color: var(--sd-team-brd); box-shadow: 0 14px 34px -18px rgba(0, 0, 0, 0.55); }
/* live scan sheen — only on hot stations */
.rp-scan { position: absolute; inset: 0; pointer-events: none; opacity: 0;
  background: linear-gradient(115deg, transparent 40%, var(--sd-team-strain-soft) 50%, transparent 60%); background-size: 250% 100%; }
.rp-card.strain .rp-scan, .rp-card.crit .rp-scan { opacity: 1; animation: rp-sheen 3.4s ease-in-out infinite; }

.rp-who { display: flex; align-items: center; gap: 11px; }
.rp-ring { position: relative; width: 44px; height: 44px; flex: 0 0 44px; border-radius: 50%; display: grid; place-items: center;
  background: conic-gradient(var(--sd-team-core) var(--p, 0%), var(--sd-team-deep-soft) 0); transition: --p 0.9s var(--sd-ease, ease-out); }
.rp-card.strain .rp-ring, .rp-card.crit .rp-ring { background: conic-gradient(var(--sd-team-strain) var(--p, 0%), var(--sd-team-deep-soft) 0); }
.rp-ava { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; font-style: normal;
  font-family: var(--sd-mono); font-size: 12px; font-weight: 800; color: var(--sd-team-hi); background: var(--sd-team-deep-bg);
  border: 1px solid var(--sd-team-brd); }
[data-theme="light"] .rp-ava { color: #6d4a0a; background: #fdf6e5; }
.rp-dot { position: absolute; right: -1px; bottom: -1px; width: 11px; height: 11px; border-radius: 50%;
  background: var(--sd-team-sync); border: 2px solid var(--sd-surface); }
.rp-dot[data-s="busy"] { background: var(--sd-team-core); }
.rp-dot[data-s="away"] { background: var(--sd-team-idle); }
.rp-idn { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.rp-idn b { font-size: 13.5px; font-weight: 750; color: var(--sd-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rp-tag { font-style: normal; font-size: 10px; color: var(--sd-text-muted); }
.rp-card.strain .rp-tag, .rp-card.crit .rp-tag { color: var(--sd-team-strain); }
.rp-load { font-size: 22px; font-weight: 800; color: var(--sd-team-core); font-variant-numeric: tabular-nums; }
.rp-card.strain .rp-load, .rp-card.crit .rp-load { color: var(--sd-team-strain); }

.rp-cells { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; }
.rp-cell { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 2px; border-radius: 9px;
  background: var(--sd-team-deep-soft); border: 1px solid transparent; }
.rp-cell :deep(svg) { color: var(--sd-text-dim); }
.rp-cell b { font-family: var(--sd-mono); font-size: 14px; font-weight: 800; line-height: 1; color: var(--sd-text); }
.rp-cell i { font-style: normal; font-size: 7px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--sd-text-dim); }
.rp-cell.z { opacity: 0.5; }
.rp-cell.hot:not(.z) { background: var(--sd-team-strain-soft); border-color: color-mix(in srgb, var(--sd-team-strain) 30%, transparent); }
.rp-cell.hot:not(.z) b, .rp-cell.hot:not(.z) :deep(svg) { color: var(--sd-team-strain); }
.rp-cell.crit:not(.z) { background: rgba(239, 68, 68, 0.12); border-color: rgba(239, 68, 68, 0.3); }
.rp-cell.crit:not(.z) b, .rp-cell.crit:not(.z) :deep(svg) { color: var(--sd-pri-critical, #ef4444); }
.rp-cell.due:not(.z) b, .rp-cell.due:not(.z) :deep(svg) { color: var(--sd-team-core); }
.rp-cell.ok:not(.z) b, .rp-cell.ok:not(.z) :deep(svg) { color: var(--sd-team-sync); }

.rp-meter { display: flex; gap: 2px; height: 6px; border-radius: 4px; overflow: hidden; background: var(--sd-team-deep-soft); }
.rp-meter i { transition: flex 0.6s var(--sd-spring); }
.rp-meter i.ok { background: color-mix(in srgb, var(--sd-team-core) 70%, transparent); }
.rp-meter i.hot { background: var(--sd-team-strain); }
.rp-meter i.crit { background: var(--sd-pri-critical, #ef4444); }

/* ── drill ── */
.rp-drill { margin-top: 2px; border-top: 1px solid var(--sd-divider, var(--sd-border)); padding-top: 13px; }
.rp-drill-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.rp-drill-head b { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; letter-spacing: 0.12em; color: var(--sd-team-core); }
.rp-clear { display: inline-flex; align-items: center; gap: 5px; font-size: 9.5px; letter-spacing: 0.08em; cursor: pointer;
  padding: 5px 10px; border-radius: 999px; border: 1px solid var(--sd-team-brd); background: var(--sd-team-soft); color: var(--sd-team-core); }

/* ── skeleton / empty ── */
.rp-skel { flex: 0 0 clamp(224px, 24vw, 268px); height: 150px; border-radius: 18px; overflow: hidden;
  border: 1px solid var(--sd-border); background: var(--sd-surface); }
.rp-skel span { display: block; height: 100%;
  background: linear-gradient(100deg, transparent 30%, var(--sd-team-soft) 50%, transparent 70%);
  background-size: 200% 100%; animation: rp-shimmer 1.4s linear infinite; }
.rp-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 30px;
  color: var(--sd-text-muted); border: 1px dashed var(--sd-border-strong); border-radius: 16px; }
.rp-empty-ring { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 50%;
  background: var(--sd-team-soft); border: 1px solid var(--sd-team-brd); color: var(--sd-team-core); }

@keyframes rp-deal { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
@keyframes rp-drift { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-24px, 18px); } }
@keyframes rp-scanline { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.9; } }
@keyframes rp-ping { 0% { box-shadow: 0 0 0 0 var(--sd-team-soft); } 70% { box-shadow: 0 0 0 7px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }
@keyframes rp-spin { to { transform: rotate(360deg); } }
@keyframes rp-sheen { 0% { background-position: 150% 0; } 100% { background-position: -150% 0; } }
@keyframes rp-shimmer { to { background-position: -200% 0; } }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .rp-aura,
  html:not([data-cinematic="on"]) .rp-pip,
  html:not([data-cinematic="on"]) .rp.live::before,
  html:not([data-cinematic="on"]) .rp-scan,
  html:not([data-cinematic="on"]) .rp-card,
  html:not([data-cinematic="on"]) .rp-skel span { animation: none; }
  html:not([data-cinematic="on"]) .rp-card:hover { transform: none; }
}
</style>
