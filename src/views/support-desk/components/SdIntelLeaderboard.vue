<template>
  <!-- Crew rankings — desk-wide resolver leaderboard for the range: resolutions,
       MTTR, CSAT and live load. Rank 1 wears the station master's brass plate. -->
  <div class="sd-ilb">
    <button v-for="(a, i) in agents" :key="a.agent_id" type="button" class="ilb-row" :class="{ lead: i === 0 }"
      :style="{ '--i': i }" @click="$emit('go', 'all')">
      <span class="rank sd-mono" :class="{ brass: i === 0 }">{{ i + 1 }}</span>
      <span class="who">
        <span class="nm">{{ a.name || 'Unnamed agent' }}</span>
        <span class="meta sd-mono">
          MTTR {{ fmtMins(a.mttr_minutes) }}
          <template v-if="a.csat_avg != null"> · CSAT {{ a.csat_avg.toFixed(1) }}★</template>
        </span>
      </span>
      <span class="load sd-mono" :title="`${a.active_load} active now`">
        <Layers :size="12" /> {{ a.active_load }}
        <b v-if="a.breaching" class="brc" :title="`${a.breaching} breaching`">⚠{{ a.breaching }}</b>
      </span>
      <span class="res"><SdIntelFlap :value="a.resolved_range" :min-cells="2" size="sm" tone="up" :boot-delay="i * 90" /></span>
    </button>
    <p v-if="!agents.length" class="ilb-empty">{{ loading ? 'Compiling the crew sheet…' : 'No resolutions in this range yet.' }}</p>
  </div>
</template>

<script setup>
import { Layers } from 'lucide-vue-next'
import SdIntelFlap from './SdIntelFlap.vue'

defineProps({
  agents: { type: Array, default: () => [] },  // IntelAgentRow[]
  loading: { type: Boolean, default: false },
})
defineEmits(['go'])

const fmtMins = (m) => { if (m == null) return '—'; if (m < 60) return `${Math.round(m)}m`; if (m < 1440) return `${(m / 60).toFixed(1)}h`; return `${(m / 1440).toFixed(1)}d` }
</script>

<style scoped>
.sd-ilb { display: flex; flex-direction: column; gap: 6px; }
.ilb-row { display: grid; grid-template-columns: 30px 1fr auto auto; align-items: center; gap: 12px;
  width: 100%; padding: 9px 11px; border-radius: 12px; border: 1px solid transparent; background: transparent;
  cursor: pointer; text-align: left; transition: background 0.16s, border-color 0.16s;
  animation: sd-stream-in 0.5s var(--sd-spring) backwards; animation-delay: calc(var(--i) * 0.055s); }
.ilb-row:hover { background: var(--sd-surface-glass); border-color: var(--sd-border); }
.ilb-row.lead { border-color: color-mix(in srgb, var(--intel) 35%, transparent); background: var(--intel-faint); }

.rank { width: 26px; height: 26px; display: grid; place-items: center; border-radius: 8px;
  font-size: 12px; font-weight: 800; color: var(--sd-text-muted); background: var(--sd-surface-glass); }
.rank.brass { color: var(--intel-ink); background: var(--intel-grad); box-shadow: 0 4px 14px var(--intel-glow); }

.who { display: flex; flex-direction: column; gap: 2px; overflow: hidden; }
.nm { font-size: 13px; font-weight: 700; color: var(--sd-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.meta { font-size: 10px; color: var(--sd-text-dim); letter-spacing: 0.05em; }

.load { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--sd-text-muted); }
.load .brc { color: var(--intel-dn); font-weight: 700; margin-left: 3px; }

.ilb-empty { text-align: center; color: var(--sd-text-dim); font-size: 12.5px; padding: 16px; margin: 0; }

@media (prefers-reduced-motion: reduce) { html:not([data-cinematic="on"]) .ilb-row { animation: none; } }
</style>
