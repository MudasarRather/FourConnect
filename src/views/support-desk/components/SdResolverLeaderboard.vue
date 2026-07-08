<template>
  <section v-if="leaderboard.length" class="rlb sd-card" aria-label="Resolver leaderboard — 30 days">
    <div class="rlb-head">
      <span class="rlb-eyebrow sd-mono"><Trophy :size="13" /> RESOLVER LEADERBOARD — 30 DAYS</span>
      <span class="rlb-count sd-mono">TOP {{ leaderboard.length }}</span>
    </div>
    <div class="rlb-rows">
      <Motion v-for="(r, i) in rows" :key="String(r.agent_id)" as="button" class="rlb-row"
        :class="{ on: String(active) === String(r.agent_id) }"
        :initial="{ opacity: 0, x: -14 }" :animate="{ opacity: 1, x: 0 }"
        :transition="{ duration: 0.35, delay: Math.min(i * 0.05, 0.4), ease: [0.16, 1, 0.3, 1] }"
        :title="`Filter the desk to fixes recorded by ${r.name || 'this agent'}`"
        @click="$emit('pick', String(r.agent_id))">
        <span class="rlb-rank sd-mono" :class="'p' + (i + 1)">{{ i + 1 }}</span>
        <span class="rlb-ava" aria-hidden="true">{{ initials(r.name) }}</span>
        <span class="rlb-id">
          <b class="rlb-name">{{ r.name || 'Agent' }}</b>
          <span class="rlb-bar" aria-hidden="true"><i :style="{ width: r.pct + '%' }" /></span>
        </span>
        <span class="rlb-n sd-mono"><b>{{ r.resolved_30d }}</b><i>FIXES</i></span>
        <span class="rlb-csat sd-mono" :class="{ none: r.csat_avg == null, low: r.csat_avg != null && r.csat_avg <= 2.5 }">
          <Star :size="10" /><b>{{ r.csat_avg != null ? r.csat_avg.toFixed(1) : '—' }}</b>
        </span>
        <span class="rlb-ttr sd-mono"><Timer :size="10" /><b>{{ fmtMin(r.avg_ttr_minutes) }}</b></span>
        <span v-if="r.low_csat" class="rlb-low sd-mono" :title="`${r.low_csat} rating(s) at 2★ or below`">{{ r.low_csat }} LOW</span>
      </Motion>
    </div>
  </section>
</template>

<script setup>
/* SdResolverLeaderboard — who is carrying the closeout record: top resolvers of the last
   30 days with their CSAT voice and speed. Attribution = resolved_by (assignee for legacy
   rows). Clicking a row filters the desk to that resolver (toggle). Replaces the sibling
   desks' SdSquadLoad slot with a RECORD view instead of a live-load view. */
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { Trophy, Star, Timer } from 'lucide-vue-next'

const props = defineProps({
  leaderboard: { type: Array, default: () => [] },   // ResolverLoad[] from /resolved/stats
  active: { type: [String, null], default: '' },     // currently-filtered resolved_by
  reduced: { type: Boolean, default: false },
})
defineEmits(['pick'])

const rows = computed(() => {
  const max = Math.max(1, ...props.leaderboard.map(r => r.resolved_30d || 0))
  return props.leaderboard.map(r => ({ ...r, pct: Math.max(6, Math.round(100 * (r.resolved_30d || 0) / max)) }))
})
const initials = (n) => (n || 'A').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
const fmtMin = (m) => {
  if (m == null) return '—'
  if (m < 60) return `${Math.round(m)}m`
  if (m < 1440) return `${(m / 60).toFixed(1)}h`
  return `${(m / 1440).toFixed(1)}d`
}
</script>

<style scoped>
.rlb { padding: 14px 16px 15px; border-color: var(--sd-res-brd); }
.rlb-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 11px; }
.rlb-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-size: 10px; font-weight: 800;
  letter-spacing: 0.2em; color: var(--sd-res-brass); }
.rlb-count { font-size: 10px; font-weight: 800; letter-spacing: 0.14em; color: var(--sd-text-dim); }

.rlb-rows { display: flex; flex-direction: column; gap: 6px; }
.rlb-row { display: grid; grid-template-columns: 26px 30px minmax(120px, 1fr) 64px 56px 64px auto;
  align-items: center; gap: 10px; padding: 8px 11px; border-radius: 12px; text-align: left; cursor: pointer;
  font-family: inherit; color: var(--sd-text); border: 1px solid var(--sd-border); background: var(--sd-surface-glass);
  transition: border-color 0.2s, background 0.2s; }
.rlb-row:hover { border-color: var(--sd-res-core); }
.rlb-row.on { border-color: var(--sd-res-core); background: var(--sd-res-soft); }

.rlb-rank { font-size: 11px; font-weight: 800; color: var(--sd-text-dim); text-align: center; }
.rlb-rank.p1 { color: var(--sd-res-brass); }
.rlb-rank.p2 { color: var(--sd-res-hi); }
.rlb-rank.p3 { color: var(--sd-res-core); }
.rlb-ava { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%;
  font-size: 10px; font-weight: 800; color: var(--sd-res-hi);
  background: var(--sd-res-deep-soft); border: 1px solid var(--sd-res-brd); }
.rlb-id { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.rlb-name { font-size: 12.5px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rlb-bar { position: relative; height: 4px; border-radius: 3px; overflow: hidden;
  background: color-mix(in srgb, var(--sd-res-core) 10%, transparent); }
.rlb-bar i { position: absolute; inset: 0 auto 0 0; border-radius: 3px;
  background: linear-gradient(90deg, var(--sd-res-deep), var(--sd-res-core)); transition: width 0.8s var(--sd-spring); }

.rlb-n, .rlb-csat, .rlb-ttr { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; }
.rlb-n { flex-direction: column; align-items: flex-end; gap: 0; }
.rlb-n b { font-size: 14px; font-weight: 800; color: var(--sd-res-core); }
.rlb-n i { font-style: normal; font-size: 7.5px; font-weight: 800; letter-spacing: 0.14em; color: var(--sd-text-dim); }
.rlb-csat { color: var(--sd-res-brass); font-weight: 800; }
.rlb-csat.none { color: var(--sd-text-dim); }
.rlb-csat.low { color: var(--sd-res-risk); }
.rlb-ttr { color: var(--sd-text-muted); font-weight: 800; }
.rlb-low { justify-self: end; padding: 2px 7px; border-radius: 999px; font-size: 8.5px; font-weight: 800;
  letter-spacing: 0.1em; color: var(--sd-res-risk);
  border: 1px solid color-mix(in srgb, var(--sd-res-risk) 45%, transparent); background: var(--sd-res-risk-soft); }

@media (max-width: 760px) {
  .rlb-row { grid-template-columns: 26px 30px 1fr 64px; }
  .rlb-csat, .rlb-ttr, .rlb-low { display: none; }
}
</style>
