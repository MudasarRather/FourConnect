<template>
  <section class="qcr sd-card">
    <header class="qcr-head">
      <span class="qcr-title sd-mono"><Stethoscope :size="12" /> AGENT LOAD · <b>MOST LOADED</b></span>
      <span v-if="util.load_pct != null" class="qcr-sub sd-mono" :class="{ hot: util.load_pct >= 90 }">
        FLEET {{ Math.round(util.load_pct) }}% OF CAPACITY</span>
    </header>

    <div class="qcr-list">
      <div v-for="(a, i) in agents" :key="a.user_id" class="qcr-row" :style="{ '--i': i }">
        <span class="qcr-pulse" :style="{ '--sc': statusColor(a.status) }" :title="`Signal: ${a.status}`" />
        <div class="qcr-who">
          <b>{{ a.name }}</b>
          <span class="sd-mono">{{ a.open_count }} open{{ a.cap ? ` / cap ${a.cap}` : '' }} · {{ a.status.toUpperCase() }}</span>
        </div>
        <span class="qcr-segs" aria-hidden="true">
          <i v-for="s in segCount" :key="s" class="qcr-seg"
            :class="segCls(a, s)" :style="{ '--d': (s * 0.05) + 's' }" />
        </span>
      </div>
    </div>

    <div v-if="!agents.length" class="qcr-empty">
      <Users :size="20" />
      <p>Nobody is carrying open work right now.</p>
    </div>
    <footer v-else-if="util.crew_capacity" class="qcr-foot sd-mono">
      {{ util.open_capped }} OPEN ACROSS CAPPED LANES · CREW CAPACITY {{ util.crew_capacity }}
    </footer>
  </section>
</template>

<script setup>
/* SdVitalsCrewRounds — the utilization block as a physician rounding list: the
   most-loaded agents with availability pulse, open-vs-cap readout and an igniting
   LED segment meter (green → amber → red over cap). Fed by overview.utilization. */
import { computed } from 'vue'
import { Stethoscope, Users } from 'lucide-vue-next'
import { AGENT_STATUS_META } from '@/composables/useSupportDesk'

const props = defineProps({
  utilization: { type: Object, default: () => ({}) },
})

const util = computed(() => props.utilization || {})
const agents = computed(() => util.value.top_agents || [])
const segCount = 8

const statusColor = (s) => AGENT_STATUS_META[s]?.color || 'var(--sd-qv-go)'
const segCls = (a, s) => {
  const cap = a.cap || segCount
  const lit = Math.round((a.open_count / Math.max(1, cap)) * segCount)
  if (s > lit) return ''
  const frac = s / segCount
  const over = a.cap && a.open_count > a.cap
  if (over && s > (a.cap / Math.max(1, a.open_count)) * lit) return 'on r blink'
  return frac > 0.85 ? 'on r' : frac > 0.6 ? 'on w' : 'on'
}
</script>

<style scoped>
.qcr { border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; }
.qcr-head { display: flex; justify-content: space-between; align-items: center; gap: 10px;
  padding: 13px 16px; border-bottom: 1px solid var(--sd-border); }
.qcr-title { display: inline-flex; align-items: center; gap: 7px; font-size: 9.5px; letter-spacing: 0.18em;
  font-weight: 800; color: var(--sd-text-dim); text-transform: uppercase; }
.qcr-title b { color: var(--sd-qv-core); }
.qcr-sub { font-size: 9px; letter-spacing: 0.12em; color: var(--sd-text-dim); }
.qcr-sub.hot { color: var(--sd-qv-halt); font-weight: 800; }
.qcr-list { display: flex; flex-direction: column; }
.qcr-row { display: flex; align-items: center; gap: 11px; padding: 10px 16px;
  border-bottom: 1px solid var(--sd-border);
  animation: qcr-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: calc(var(--i) * 0.06s); }
.qcr-row:last-child { border-bottom: none; }
.qcr-pulse { width: 9px; height: 9px; border-radius: 50%; flex: none; background: var(--sc);
  animation: qcr-ping 2.4s infinite; }
.qcr-who { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.qcr-who b { font-size: 12px; font-weight: 800; color: var(--sd-text); overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap; }
.qcr-who span { font-size: 9px; letter-spacing: 0.1em; color: var(--sd-text-dim); }
.qcr-segs { display: inline-flex; gap: 3px; flex: none; }
.qcr-seg { width: 9px; height: 13px; border-radius: 2.5px;
  background: color-mix(in srgb, var(--sd-qs-rail) 22%, transparent); }
.qcr-seg.on { background: var(--sd-qv-go); animation: qcr-light 0.3s ease-out both; animation-delay: var(--d); }
.qcr-seg.on.w { background: var(--sd-qv-warn); }
.qcr-seg.on.r { background: var(--sd-qv-halt); }
.qcr-seg.on.blink { animation: qcr-light 0.3s ease-out both, qcr-blink 1.2s steps(2, end) infinite; animation-delay: var(--d), 0.8s; }
.qcr-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 24px 18px;
  color: var(--sd-text-dim); text-align: center; }
.qcr-empty p { margin: 0; font-size: 11.5px; }
.qcr-foot { padding: 10px 16px; font-size: 8.5px; letter-spacing: 0.14em; color: var(--sd-text-dim);
  border-top: 1px solid var(--sd-border); margin-top: auto; }

@keyframes qcr-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes qcr-ping { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--sc) 45%, transparent); }
  55% { box-shadow: 0 0 0 6px transparent; } }
@keyframes qcr-light { from { transform: scaleY(0.2); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes qcr-blink { 50% { opacity: 0.25; } }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .qcr-row,
  html:not([data-cinematic="on"]) .qcr-pulse,
  html:not([data-cinematic="on"]) .qcr-seg.on { animation: none; }
}
</style>
