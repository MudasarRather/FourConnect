<template>
  <!-- Platform status — per-team scoreboard. Each squad is a platform with its
       live load, hazards and service quality; worst platforms surface first. -->
  <div class="sd-itb">
    <div class="itb-head sd-mono">
      <span class="h name">Platform</span><span class="h">Open</span><span class="h">Unassigned</span>
      <span class="h">Critical</span><span class="h">Delayed</span><span class="h sla">SLA</span><span class="h">CSAT</span>
    </div>
    <button v-for="(tm, i) in teams" :key="tm.team_id || 'untriaged'" type="button" class="itb-row"
      :style="{ '--i': i }" @click="$emit('go', 'team')">
      <span class="c name">
        <i class="tm-chip" :style="{ background: tm.color || 'var(--intel)' }" />
        <span class="tm-name">{{ tm.name }}</span>
      </span>
      <span class="c num"><SdIntelFlap :value="tm.open" :min-cells="2" size="sm" :boot-delay="i * 90" /></span>
      <span class="c num sd-mono" :class="{ warn: tm.unassigned > 0 }">{{ tm.unassigned }}</span>
      <span class="c num sd-mono" :class="{ bad: tm.critical > 0 }">{{ tm.critical }}</span>
      <span class="c num sd-mono" :class="{ bad: tm.breached_active > 0 }">{{ tm.breached_active }}</span>
      <span class="c sla">
        <span class="sla-track"><i :style="{ width: (tm.sla_met_pct ?? 0) + '%', background: tone(tm.sla_met_pct) }" /></span>
        <span class="sla-v sd-mono" :style="{ color: tone(tm.sla_met_pct) }">{{ tm.sla_met_pct == null ? '—' : tm.sla_met_pct + '%' }}</span>
      </span>
      <span class="c num sd-mono" :class="csatCls(tm.csat_avg)">{{ tm.csat_avg == null ? '—' : tm.csat_avg.toFixed(1) }}</span>
    </button>
    <p v-if="!teams.length" class="itb-empty">No platforms in service{{ loading ? '…' : '.' }}</p>
  </div>
</template>

<script setup>
import SdIntelFlap from './SdIntelFlap.vue'

defineProps({
  teams: { type: Array, default: () => [] },   // IntelTeamRow[]
  loading: { type: Boolean, default: false },
})
defineEmits(['go'])

const tone = (v) => (v == null ? 'var(--sd-text-dim)' : v >= 90 ? 'var(--intel-up)' : v >= 70 ? 'var(--intel)' : 'var(--intel-dn)')
const csatCls = (v) => (v == null ? '' : v >= 4 ? 'ok' : v >= 3 ? 'warn' : 'bad')
</script>

<style scoped>
.sd-itb { display: flex; flex-direction: column; }
.itb-head, .itb-row { display: grid; align-items: center; gap: 10px;
  grid-template-columns: minmax(120px, 1.5fr) 52px 76px 60px 60px minmax(110px, 1fr) 48px; }
.itb-head { padding: 2px 10px 9px; }
.h { font-size: 9px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: var(--sd-text-dim); text-align: center; }
.h.name { text-align: left; }

.itb-row { width: 100%; border: 1px solid transparent; border-top-color: var(--sd-border); background: transparent;
  padding: 10px; cursor: pointer; text-align: left; border-radius: 10px; transition: background 0.16s, border-color 0.16s;
  animation: sd-stream-in 0.5s var(--sd-spring) backwards; animation-delay: calc(var(--i) * 0.06s); }
.itb-row:hover { background: var(--sd-surface-glass); border-color: var(--sd-border); }

.c.name { display: flex; align-items: center; gap: 9px; overflow: hidden; }
.tm-chip { width: 10px; height: 10px; border-radius: 3px; flex: none; box-shadow: 0 0 8px color-mix(in srgb, var(--intel) 40%, transparent); }
.tm-name { font-size: 13px; font-weight: 600; color: var(--sd-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.c.num { text-align: center; font-size: 12.5px; font-weight: 700; color: var(--sd-text-secondary); }
.c.num.ok { color: var(--intel-up); } .c.num.warn { color: var(--intel); } .c.num.bad { color: var(--intel-dn); }
.c.sla { display: flex; align-items: center; gap: 8px; }
.sla-track { flex: 1; height: 6px; border-radius: 999px; background: var(--sd-surface-glass); overflow: hidden; }
.sla-track i { display: block; height: 100%; border-radius: 999px; transform-origin: left;
  animation: sd-bar-grow 0.8s var(--sd-spring) backwards; animation-delay: calc(var(--i) * 0.06s + 0.2s); }
.sla-v { font-size: 10.5px; font-weight: 700; min-width: 34px; text-align: right; }

.itb-empty { text-align: center; color: var(--sd-text-dim); font-size: 12.5px; padding: 16px; margin: 0; }

@media (max-width: 720px) {
  .itb-head, .itb-row { grid-template-columns: minmax(100px, 1.4fr) 46px 54px minmax(90px, 1fr) 42px; }
  .h:nth-child(3), .c:nth-child(3), .h:nth-child(4), .c:nth-child(4) { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .itb-row, html:not([data-cinematic="on"]) .sla-track i { animation: none; }
}
</style>
