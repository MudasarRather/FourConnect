<template>
  <section class="qsg sd-card">
    <header class="qsg-head">
      <span class="qsg-title sd-mono"><Wind :size="12" /> SLA SPLIT · <b>RESPONSE vs RESOLUTION</b></span>
      <span class="qsg-sub sd-mono">{{ days }}D RANGE</span>
    </header>

    <div class="qsg-dials">
      <div v-for="d in dials" :key="d.label" class="qsg-dial" :title="d.title">
        <svg width="104" height="104" viewBox="0 0 104 104" aria-hidden="true">
          <circle cx="52" cy="52" r="42" fill="none" stroke="color-mix(in srgb, var(--sd-qs-rail) 22%, transparent)" stroke-width="8" />
          <circle class="qsg-arc" cx="52" cy="52" r="42" fill="none" :stroke="d.color" stroke-width="8"
            stroke-linecap="round" stroke-dasharray="264" :stroke-dashoffset="d.offset" />
        </svg>
        <span class="qsg-dial-t">
          <b class="sd-mono">{{ d.value == null ? '—' : d.value + '%' }}</b>
          <i>{{ d.label }}</i>
          <em v-if="d.trend" class="sd-mono" :class="d.trendCls">{{ d.trend }}</em>
        </span>
      </div>
    </div>

    <div class="qsg-pri sd-mono">
      <div v-for="p in priorities" :key="p.key" class="qsg-row">
        <span class="qsg-lb">{{ p.key.toUpperCase() }}</span>
        <span class="qsg-track"><span class="qsg-fill" :class="p.cls" :style="{ width: (p.pct ?? 0) + '%' }" /></span>
        <span class="qsg-val" :class="p.cls">{{ p.pct == null ? '—' : p.pct + '%' }}</span>
      </div>
      <p v-if="!priorities.length" class="qsg-none">No resolved work with SLA targets in this range yet.</p>
    </div>
  </section>
</template>

<script setup>
/* SdVitalsSlaGases — the SLA split as an arterial-gas panel: twin draw-in dials for
   response vs resolution attainment (with period-over-period point deltas), then
   per-priority resolution attainment bars. Fed by overview.sla_split + deltas. */
import { computed } from 'vue'
import { Wind } from 'lucide-vue-next'

const props = defineProps({
  slaSplit: { type: Object, default: () => ({}) },  // {response, resolution, by_priority}
  deltas: { type: Object, default: () => ({}) },    // {sla_response, sla_resolution}
  days: { type: Number, default: 7 },
})

const dial = (value, label, deltaKey, title) => {
  const d = props.deltas[deltaKey] || {}
  return {
    label, value, title,
    color: value == null ? 'var(--sd-qs-rail)' : value >= 92 ? 'var(--sd-qv-go)' : value >= 80 ? 'var(--sd-qv-core)' : 'var(--sd-qv-halt)',
    offset: value == null ? 264 : Math.round(264 - (264 * value) / 100),
    trend: d.pct == null ? '' : `${d.pct >= 0 ? '▲' : '▼'} ${Math.abs(d.pct)}pt`,
    trendCls: d.pct == null ? '' : d.pct >= 0 ? 'up' : 'dn',
  }
}
const dials = computed(() => [
  dial(props.slaSplit.response, 'RESPONSE', 'sla_response', 'First responses that beat their SLA clock'),
  dial(props.slaSplit.resolution, 'RESOLUTION', 'sla_resolution', 'Resolutions that beat their SLA clock'),
])

const PRI_ORDER = ['critical', 'high', 'medium', 'low']
const priorities = computed(() => {
  const by = props.slaSplit.by_priority || {}
  return PRI_ORDER.filter(k => by[k]).map(k => ({
    key: k, pct: by[k].pct,
    cls: by[k].pct == null ? '' : by[k].pct >= 90 ? 'ok' : by[k].pct >= 70 ? 'warn' : 'bad',
  }))
})
</script>

<style scoped>
.qsg { border-radius: 16px; overflow: hidden; }
.qsg-head { display: flex; justify-content: space-between; align-items: center; gap: 10px;
  padding: 13px 16px; border-bottom: 1px solid var(--sd-border); }
.qsg-title { display: inline-flex; align-items: center; gap: 7px; font-size: 9.5px; letter-spacing: 0.18em;
  font-weight: 800; color: var(--sd-text-dim); text-transform: uppercase; }
.qsg-title b { color: var(--sd-qv-core); }
.qsg-sub { font-size: 9px; letter-spacing: 0.14em; color: var(--sd-text-dim); }
.qsg-dials { display: flex; gap: 18px; justify-content: center; padding: 16px 12px 4px; flex-wrap: wrap; }
.qsg-dial { position: relative; width: 104px; height: 104px; }
.qsg-dial svg { transform: rotate(-90deg); }
.qsg-arc { animation: qsg-dash 1.7s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both; }
.qsg-dial-t { position: absolute; inset: 0; display: grid; place-items: center; text-align: center;
  align-content: center; gap: 1px; }
.qsg-dial-t b { font-size: 17px; font-weight: 800; color: var(--sd-text); font-variant-numeric: tabular-nums; }
.qsg-dial-t i { font-style: normal; font-size: 7.5px; letter-spacing: 0.18em; color: var(--sd-text-dim); font-weight: 700; }
.qsg-dial-t em { font-style: normal; font-size: 8.5px; font-weight: 800; }
.qsg-dial-t em.up { color: var(--sd-qv-go); }
.qsg-dial-t em.dn { color: var(--sd-qv-halt); }
.qsg-pri { display: flex; flex-direction: column; gap: 8px; padding: 12px 17px 16px; }
.qsg-row { display: grid; grid-template-columns: 62px 1fr 42px; gap: 10px; align-items: center; }
.qsg-lb { font-size: 9px; letter-spacing: 0.1em; color: var(--sd-text-muted); font-weight: 700; }
.qsg-track { height: 6px; border-radius: 4px; overflow: hidden;
  background: color-mix(in srgb, var(--sd-qs-rail) 22%, transparent); }
.qsg-fill { display: block; height: 100%; border-radius: 4px; transform-origin: left;
  background: linear-gradient(90deg, var(--sd-qv-core), var(--sd-qv-go));
  animation: qsg-grow 1.1s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both; }
.qsg-fill.warn { background: linear-gradient(90deg, var(--sd-qv-core), var(--sd-qv-warn)); }
.qsg-fill.bad { background: linear-gradient(90deg, var(--sd-qv-halt), var(--sd-qv-warn)); }
.qsg-val { font-size: 10px; text-align: right; color: var(--sd-text-muted); font-variant-numeric: tabular-nums; }
.qsg-val.ok { color: var(--sd-qv-go); }
.qsg-val.warn { color: var(--sd-qv-warn); }
.qsg-val.bad { color: var(--sd-qv-halt); font-weight: 800; }
.qsg-none { margin: 0; font-size: 11px; color: var(--sd-text-dim); text-align: center; padding: 6px 0 2px; }

@keyframes qsg-dash { from { stroke-dashoffset: 264; } }
@keyframes qsg-grow { from { transform: scaleX(0); } }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .qsg-arc,
  html:not([data-cinematic="on"]) .qsg-fill { animation: none; }
}
</style>
