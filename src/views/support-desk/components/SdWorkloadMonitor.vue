<template>
  <!-- ══ Load Balancer — the Workload view's cinematic read of team capacity ══
       A team-utilization reactor + an animated capacity EQUALIZER (one bar per
       agent, height = open load against capacity, with balanced/overload guide
       lines), then a roster of ring-gauge agent consoles. -->
  <div class="wl">
    <header class="wl-head">
      <div class="wl-legend">
        <span class="lg balanced"><i /> Balanced ≤ {{ BUSY }}</span>
        <span class="lg busy"><i /> Busy {{ BUSY + 1 }}–{{ OVER }}</span>
        <span class="lg over"><i /> Overloaded &gt; {{ OVER }}</span>
      </div>
      <span class="wl-sum sd-mono">{{ agents.length }} agents · {{ totalActive }} active</span>
    </header>

    <!-- ── capacity reactor + equalizer ── -->
    <section class="wl-band">
      <div class="wl-gauge sd-card" :class="utilTone" :style="{ '--sd-p': (utilPct * 3.6) + 'deg' }">
        <div class="wg-ring">
          <span class="wg-sweep" aria-hidden="true" />
          <div class="wg-core"><span class="wg-val"><SdCountUp :value="utilPct" /><i>%</i></span><span class="wg-cap">team load</span></div>
        </div>
        <div class="wg-stats">
          <span class="wg-stat"><b>{{ balancedCount }}</b> balanced</span>
          <span class="wg-stat warn"><b>{{ busyCount }}</b> busy</span>
          <span class="wg-stat bad"><b>{{ overCount }}</b> overloaded</span>
        </div>
      </div>

      <div class="wl-eq sd-card">
        <header class="eq-head"><h3><BarChart3 :size="15" /> Capacity equalizer</h3><span class="eq-cap sd-mono">open load · per agent</span></header>
        <div v-if="loadAgents.length" class="eq-stage" :class="{ still: reduced }">
          <span class="eq-line over" :style="{ bottom: linePct(OVER) + '%' }"><i>overload</i></span>
          <span class="eq-line bal" :style="{ bottom: linePct(BUSY) + '%' }"><i>balanced</i></span>
          <div class="eq-bars">
            <button v-for="(a, i) in loadAgents" :key="a.id" class="eq-bar" :class="a.tone" :style="{ '--tc': a.col }" :title="`${a.name} · ${a.assigned} open`">
              <span class="eq-n sd-mono">{{ a.assigned }}</span>
              <span class="eq-track"><span class="eq-fill" :style="{ height: barPct(a.assigned) + '%', '--d': (i * 0.05).toFixed(2) + 's' }" /></span>
              <span class="eq-init">{{ a.initials }}</span>
            </button>
          </div>
        </div>
        <p v-else class="eq-empty">No assigned load to balance right now.</p>
      </div>
    </section>

    <!-- ── agent roster ── -->
    <div v-if="agents.length" class="wl-grid">
      <article v-for="(a, i) in agents" :key="a.id" class="wl-card sd-card" :class="a.tone" :style="{ '--tc': a.col, '--i': i }">
        <span class="wc-glow" aria-hidden="true" />
        <div class="wc-top">
          <span class="wc-ring" :style="{ '--sd-p': (a.loadPct * 3.6) + 'deg' }"><span class="wc-ring-core">{{ a.initials }}</span></span>
          <div class="wc-id">
            <span class="wc-name">{{ a.name }}</span>
            <span class="wc-state">{{ a.label }}</span>
          </div>
          <span class="wc-total"><SdCountUp :value="a.assigned" /></span>
        </div>
        <div class="wc-stats">
          <div class="ws"><b>{{ a.in_progress }}</b><span>In progress</span><i class="ws-bar"><em :style="{ width: sub(a.in_progress, a.assigned) + '%', background: 'var(--sd-st-progress)' }" /></i></div>
          <div class="ws"><b>{{ a.pending }}</b><span>Pending</span><i class="ws-bar"><em :style="{ width: sub(a.pending, a.assigned) + '%', background: 'var(--sd-st-pending)' }" /></i></div>
          <div class="ws"><b class="ok">{{ a.resolved_today }}</b><span>Resolved today</span><i class="ws-bar"><em :style="{ width: sub(a.resolved_today, Math.max(a.resolved_today, a.assigned)) + '%', background: 'var(--sd-success)' }" /></i></div>
        </div>
      </article>
    </div>
    <p v-else class="wl-empty">{{ loading ? 'Computing workload…' : 'No assigned tickets to balance.' }}</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { BarChart3 } from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'

const props = defineProps({
  tickets: { type: Array, default: () => [] },
  now: { type: Number, default: () => Date.now() },
  loading: { type: Boolean, default: false },
})

const cinematicOn = () => typeof document !== 'undefined' && document.documentElement.getAttribute('data-cinematic') === 'on'
const reduced = ref(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches && !cinematicOn())

const BUSY = 4, OVER = 8
const ACTIVE_ST = ['open', 'in_progress', 'pending_customer', 'pending_vendor', 'escalated']
const startOfToday = computed(() => { const d = new Date(props.now); d.setHours(0, 0, 0, 0); return d.getTime() })

const toneCol = (t) => ({ balanced: 'var(--sd-success)', busy: 'var(--sd-warning)', over: 'var(--sd-danger)', idle: 'var(--sd-steel)' }[t])
const toneLabel = (t) => ({ balanced: 'Balanced', busy: 'Busy', over: 'Overloaded', idle: 'Queue' }[t])

const agents = computed(() => {
  const map = new Map()
  const key = (t) => t.assigned_agent_id || (t.assigned_agent_name ? 't:' + t.assigned_agent_name : '__unassigned__')
  for (const t of props.tickets) {
    const k = key(t)
    if (!map.has(k)) map.set(k, { id: k, name: t.assigned_agent_name || 'Unassigned', assigned: 0, in_progress: 0, pending: 0, resolved_today: 0 })
    const a = map.get(k)
    if (ACTIVE_ST.includes(t.status)) a.assigned++
    if (t.status === 'in_progress') a.in_progress++
    if (t.status === 'pending_customer' || t.status === 'pending_vendor') a.pending++
    if (t.status === 'resolved' && t.resolved_at && new Date(t.resolved_at).getTime() >= startOfToday.value) a.resolved_today++
  }
  return [...map.values()]
    .filter(a => a.assigned > 0 || a.resolved_today > 0)
    .map(a => {
      const tone = a.name === 'Unassigned' ? 'idle' : a.assigned <= BUSY ? 'balanced' : a.assigned <= OVER ? 'busy' : 'over'
      return {
        ...a, tone, col: toneCol(tone), label: toneLabel(tone),
        initials: a.name === 'Unassigned' ? '—' : a.name.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase(),
        loadPct: Math.min(100, Math.round((a.assigned / (OVER + 2)) * 100)),
      }
    })
    .sort((a, b) => b.assigned - a.assigned)
})

const totalActive = computed(() => agents.value.reduce((s, a) => s + a.assigned, 0))
const namedAgents = computed(() => agents.value.filter(a => a.tone !== 'idle'))
const loadAgents = computed(() => agents.value.filter(a => a.assigned > 0).slice(0, 16))
const maxLoad = computed(() => Math.max(OVER + 2, ...loadAgents.value.map(a => a.assigned)))
const barPct = (v) => Math.max(v > 0 ? 6 : 0, Math.round((v / maxLoad.value) * 100))
const linePct = (v) => Math.round((v / maxLoad.value) * 100)
const sub = (v, total) => (total > 0 ? Math.round((v / total) * 100) : 0)

const balancedCount = computed(() => namedAgents.value.filter(a => a.tone === 'balanced').length)
const busyCount = computed(() => namedAgents.value.filter(a => a.tone === 'busy').length)
const overCount = computed(() => namedAgents.value.filter(a => a.tone === 'over').length)
const utilPct = computed(() => {
  if (!namedAgents.value.length) return 0
  const avg = namedAgents.value.reduce((s, a) => s + a.assigned, 0) / namedAgents.value.length
  return Math.min(100, Math.round((avg / OVER) * 100))
})
const utilTone = computed(() => (utilPct.value >= 90 ? 'bad' : utilPct.value >= 60 ? 'warn' : 'ok'))
</script>

<style scoped>
.wl { display: flex; flex-direction: column; gap: 14px; }
.wl-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
.wl-legend { display: flex; flex-wrap: wrap; gap: 14px; }
.lg { display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--sd-text-muted); }
.lg i { width: 9px; height: 9px; border-radius: 50%; }
.lg.balanced i { background: var(--sd-success); box-shadow: 0 0 7px var(--sd-success); }
.lg.busy i { background: var(--sd-warning); box-shadow: 0 0 7px var(--sd-warning); }
.lg.over i { background: var(--sd-danger); box-shadow: 0 0 7px var(--sd-danger); }
.wl-sum { font-size: 12px; color: var(--sd-text-dim); }

/* ── reactor + equalizer band ── */
.wl-band { display: grid; grid-template-columns: 250px 1fr; gap: 14px; align-items: stretch; }

.wl-gauge { position: relative; overflow: hidden; padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 16px; --gc: var(--sd-success); }
.wl-gauge.ok { --gc: var(--sd-success); } .wl-gauge.warn { --gc: var(--sd-warning); } .wl-gauge.bad { --gc: var(--sd-danger); }
.wg-ring { position: relative; width: 138px; height: 138px; border-radius: 50%; display: grid; place-items: center;
  background: conic-gradient(var(--gc) var(--sd-p, 0deg), color-mix(in srgb, var(--sd-text-dim) 22%, transparent) 0);
  transition: --sd-p 0.9s var(--sd-spring); box-shadow: 0 0 28px color-mix(in srgb, var(--gc) 24%, transparent); }
.wg-ring::after { content: ""; position: absolute; inset: 10px; border-radius: 50%; background: var(--sd-surface-elevated);
  box-shadow: inset 0 0 22px color-mix(in srgb, var(--gc) 20%, transparent); }
.wg-sweep { position: absolute; inset: -2px; border-radius: 50%; pointer-events: none;
  background: conic-gradient(from 0deg, transparent 0 80%, color-mix(in srgb, var(--gc) 52%, transparent) 93%, transparent 100%);
  -webkit-mask: radial-gradient(closest-side, transparent 67%, #000 70%); mask: radial-gradient(closest-side, transparent 67%, #000 70%);
  animation: wl-rotate 5s linear infinite; }
.wg-core { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; }
.wg-val { font-size: 31px; font-weight: 850; color: var(--sd-text); letter-spacing: -0.03em; line-height: 1; }
.wg-val i { font-size: 15px; font-style: normal; color: var(--sd-text-muted); }
.wg-cap { font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--sd-text-muted); margin-top: 5px; }
.wg-stats { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.wg-stat { display: flex; align-items: center; justify-content: space-between; font-size: 11.5px; color: var(--sd-text-muted); padding: 3px 0; border-top: 1px solid var(--sd-border); }
.wg-stat:first-child { border-top: none; }
.wg-stat b { color: var(--sd-success); font-weight: 800; font-size: 14px; }
.wg-stat.warn b { color: var(--sd-warning); } .wg-stat.bad b { color: var(--sd-danger); }

.wl-eq { padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; }
.eq-head { display: flex; align-items: center; justify-content: space-between; }
.eq-head h3 { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: var(--sd-text); margin: 0; }
.eq-head h3 svg { color: var(--sd-amber); }
.eq-cap { font-size: 10px; color: var(--sd-text-dim); }
.eq-stage { position: relative; flex: 1; min-height: 168px; padding: 4px 0 0; }
.eq-line { position: absolute; left: 0; right: 0; height: 0; border-top: 1px dashed; pointer-events: none; z-index: 1; }
.eq-line.over { border-color: color-mix(in srgb, var(--sd-danger) 50%, transparent); }
.eq-line.bal { border-color: color-mix(in srgb, var(--sd-success) 45%, transparent); }
.eq-line i { position: absolute; right: 0; top: -13px; font-size: 8px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; font-style: normal; padding: 1px 5px; border-radius: 5px; background: var(--sd-surface); }
.eq-line.over i { color: var(--sd-danger); } .eq-line.bal i { color: var(--sd-success); }
.eq-bars { position: relative; z-index: 2; display: flex; align-items: flex-end; justify-content: space-around; gap: 6px; height: 168px; }
.eq-bar { flex: 1; max-width: 46px; min-width: 18px; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 5px;
  background: none; border: none; padding: 0; cursor: pointer; font-family: inherit; }
.eq-n { font-size: 10px; font-weight: 800; color: var(--sd-text-secondary); }
.eq-track { position: relative; width: 100%; flex: 1; display: flex; align-items: flex-end; }
.eq-fill { width: 100%; border-radius: 6px 6px 3px 3px; background: linear-gradient(180deg, var(--tc), color-mix(in srgb, var(--tc) 55%, transparent));
  box-shadow: 0 0 14px color-mix(in srgb, var(--tc) 40%, transparent); transform-origin: bottom; transition: height 0.6s var(--sd-spring);
  animation: wl-rise 0.7s var(--sd-spring) backwards; animation-delay: var(--d); }
.eq-bar:hover .eq-fill { filter: brightness(1.15); }
.eq-init { font-size: 9px; font-weight: 700; color: var(--sd-text-muted); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.eq-empty { display: grid; place-items: center; min-height: 168px; margin: 0; font-size: 12.5px; color: var(--sd-text-muted); }

/* ── agent roster ── */
.wl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(266px, 1fr)); gap: 12px; }
.wl-card { position: relative; overflow: hidden; padding: 16px; display: flex; flex-direction: column; gap: 13px; --tc: var(--sd-steel);
  animation: sd-deal 0.5s var(--sd-spring) backwards; animation-delay: calc(var(--i) * 0.05s); border-left: 3px solid var(--tc); }
.wl-card.over { box-shadow: 0 0 0 1px color-mix(in srgb, var(--sd-danger) 32%, transparent), var(--sd-card-shadow); }
.wc-glow { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background: radial-gradient(110% 90% at 100% 0%, color-mix(in srgb, var(--tc) 10%, transparent), transparent 58%); }
.wc-top { position: relative; display: flex; align-items: center; gap: 12px; }
.wc-ring { position: relative; width: 46px; height: 46px; border-radius: 50%; flex-shrink: 0; display: grid; place-items: center;
  background: conic-gradient(var(--tc) var(--sd-p, 0deg), color-mix(in srgb, var(--sd-text-dim) 20%, transparent) 0); transition: --sd-p 0.8s var(--sd-spring); }
.wc-ring::before { content: ""; position: absolute; inset: 3px; border-radius: 50%; background: var(--sd-grad-rail); }
.wl-card.idle .wc-ring::before { background: var(--sd-surface-glass); }
.wc-ring-core { position: relative; z-index: 1; font-size: 12.5px; font-weight: 800; color: #1a1206; }
[data-theme="light"] .wc-ring-core { color: #fff8ec; }
.wl-card.idle .wc-ring-core { color: var(--sd-text-dim); }
.wc-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.wc-name { font-size: 13.5px; font-weight: 700; color: var(--sd-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wc-state { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--tc); }
.wc-total { font-size: 26px; font-weight: 850; color: var(--sd-text); letter-spacing: -0.02em; }
.wc-stats { position: relative; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.ws { display: flex; flex-direction: column; gap: 3px; padding: 9px 8px; border-radius: 10px; background: var(--sd-surface-glass); }
.ws b { font-size: 16px; font-weight: 800; color: var(--sd-text); font-variant-numeric: tabular-nums; }
.ws b.ok { color: var(--sd-success); }
.ws span { font-size: 9.5px; color: var(--sd-text-muted); }
.ws-bar { height: 3px; border-radius: 999px; background: color-mix(in srgb, var(--sd-text-dim) 18%, transparent); overflow: hidden; margin-top: 2px; }
.ws-bar em { display: block; height: 100%; border-radius: 999px; transition: width 0.6s var(--sd-spring); }
.wl-empty { text-align: center; color: var(--sd-text-dim); font-size: 13px; padding: 30px; margin: 0; }

@keyframes wl-rotate { to { transform: rotate(360deg); } }
@keyframes wl-rise { from { transform: scaleY(0); opacity: 0.4; } to { transform: scaleY(1); opacity: 1; } }

@media (max-width: 900px) { .wl-band { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .wg-sweep,
  html:not([data-cinematic="on"]) .eq-fill,
  html:not([data-cinematic="on"]) .wl-card { animation: none; }
  html:not([data-cinematic="on"]) .wg-ring,
  html:not([data-cinematic="on"]) .wc-ring { transition: none; }
}
</style>
