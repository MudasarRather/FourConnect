<template>
  <section class="ewr">
    <header class="ewr-head">
      <h3><LampDesk :size="15" /> The case room wall</h3>
      <span class="sd-mono">DESK INSTRUMENTS · PERSONAL TELEMETRY</span>
    </header>
    <div class="ewr-grid">
      <!-- 01 workload capacity -->
      <article class="ewr-card">
        <h5 class="sd-mono">01 · WORKLOAD CAPACITY</h5>
        <div class="ewr-caps">
          <div v-for="qz in queues" :key="qz.id" class="ewr-cap">
            <span class="sd-mono">{{ qz.name }}</span>
            <span class="ewr-cap-bar"><i :style="{ width: capPct(qz) }"
              :class="{ full: (qz.max_agent_load || 0) > 0 && (qz.my_active || 0) >= qz.max_agent_load }" /></span>
            <b class="sd-mono">{{ qz.my_active || 0 }}{{ qz.max_agent_load ? '/' + qz.max_agent_load : '' }}</b>
          </div>
          <p v-if="!queues.length" class="ewr-none sd-mono">NO LANES</p>
        </div>
      </article>

      <!-- 02 next breach -->
      <article class="ewr-card" :class="{ hot: breachSoon }">
        <h5 class="sd-mono">02 · NEXT SLA BREACH</h5>
        <b class="ewr-big sd-mono">{{ breachClock }}</b>
        <button v-if="closestRow" class="ewr-jump sd-mono" @click="$emit('open', closestRow)">
          {{ closestRow.ticket_number }} · OPEN IT →</button>
        <p v-else class="ewr-none sd-mono">NOTHING ON THE CLOCK</p>
      </article>

      <!-- 03 RCA debt -->
      <article class="ewr-card" :class="{ hot: (stats.missing_rca || 0) > 0 }">
        <h5 class="sd-mono">03 · ROOT-CAUSE DEBT</h5>
        <div class="ewr-gauge">
          <b class="sd-mono"><SdCountUp :value="stats.missing_rca ?? 0" /></b>
          <span>breached case{{ (stats.missing_rca || 0) === 1 ? '' : 's' }} with no recorded cause</span>
        </div>
        <span class="ewr-hint">Record RCA from the desk (<kbd>D</kbd>) — breaches without causes come back.</span>
      </article>

      <!-- 04 major incidents -->
      <article class="ewr-card" :class="{ hot: (stats.mi_active || 0) > 0 }">
        <h5 class="sd-mono">04 · MAJOR INCIDENTS</h5>
        <div class="ewr-gauge">
          <b class="sd-mono mi"><SdCountUp :value="stats.mi_active ?? 0" /></b>
          <span>live on this tier</span>
        </div>
        <span class="ewr-hint">{{ (stats.mi_active || 0) ? 'War-room rules: acknowledge, swarm, update.' : 'All quiet — no declared majors.' }}</span>
      </article>

      <!-- 05 the case archive -->
      <article class="ewr-card">
        <h5 class="sd-mono">05 · CASE ARCHIVE (KEDB)</h5>
        <div class="ewr-duo sd-mono">
          <span><b><SdCountUp :value="stats.problems_open ?? 0" /></b><em>OPEN CASES</em></span>
          <span><b class="ke"><SdCountUp :value="stats.known_errors ?? 0" /></b><em>KNOWN ERRORS</em></span>
        </div>
        <button class="ewr-jump sd-mono" @click="$emit('kedb')">SEARCH THE ARCHIVE →</button>
      </article>

      <!-- 06 permanent fixes in flight -->
      <article class="ewr-card">
        <h5 class="sd-mono">06 · PERMANENT FIXES IN FLIGHT</h5>
        <div class="ewr-gauge">
          <b class="sd-mono go"><SdCountUp :value="stats.fix_in_progress ?? 0" /></b>
          <span>tickets riding an approved change</span>
        </div>
        <span class="ewr-hint">Attach a change (<kbd>C</kbd>) so the fix outlives the ticket.</span>
      </article>

      <!-- 07 my shift -->
      <article class="ewr-card">
        <h5 class="sd-mono">07 · MY SHIFT SUMMARY</h5>
        <div class="ewr-quad sd-mono">
          <span><b><SdCountUp :value="stats.my_resolved_today ?? 0" /></b><em>RESOLVED</em></span>
          <span><b class="go"><SdCountUp :value="stats.my_breach_saves_today ?? 0" /></b><em>SLA SAVES</em></span>
          <span><b><SdCountUp :value="stats.my_logged_today_mins ?? 0" suffix="m" /></b><em>LOGGED</em></span>
          <span><b class="wa"><SdCountUp :value="stats.skips_today ?? 0" /></b><em>SKIPS</em></span>
        </div>
        <button class="ewr-jump sd-mono" @click="$emit('worklog')">LOG TIME ON THE DESK →</button>
      </article>

      <!-- 08 keyboard -->
      <article class="ewr-card">
        <h5 class="sd-mono">08 · KEYBOARD SHORTCUTS</h5>
        <div class="ewr-keys sd-mono">
          <span><kbd>S</kbd> serve/skip</span><span><kbd>R</kbd> resolve/refresh</span>
          <span><kbd>A</kbd> assign/ack</span><span><kbd>P</kbd> problem</span>
          <span><kbd>D</kbd> RCA</span><span><kbd>C</kbd> change</span>
          <span><kbd>B</kbd> send back</span><span><kbd>W</kbd> watch</span>
          <span><kbd>L</kbd> log time</span><span><kbd>G</kbd> swarm</span>
          <span><kbd>J K</kbd> move</span><span><kbd>↵</kbd> open</span>
        </div>
      </article>

      <!-- 09 live feed -->
      <article class="ewr-card">
        <h5 class="sd-mono">09 · LIVE BOARD FEED</h5>
        <div class="ewr-gauge">
          <b class="sd-mono" :class="{ wa: updatedAgo > 90 }">{{ updatedAgo }}s</b>
          <span>since the wall was refreshed</span>
        </div>
        <button v-if="newest" class="ewr-jump sd-mono" @click="$emit('open', newest)">
          NEWEST · {{ newest.ticket_number }} →</button>
      </article>
    </div>
  </section>
</template>

<script setup>
/* SdEvidenceRail — nine desk instruments under the L3 board. Plain-language labels
   (metaphor stays in the scenery); every number is real board telemetry. */
import { computed } from 'vue'
import { LampDesk } from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'

const props = defineProps({
  stats: { type: Object, default: () => ({}) },
  queues: { type: Array, default: () => [] },
  rows: { type: Array, default: () => [] },
  updatedAgo: { type: Number, default: 0 },
  now: { type: Number, default: Date.now() },
})
defineEmits(['open', 'kedb', 'worklog'])

const capPct = (qz) => {
  if (!qz.max_agent_load) return Math.min(100, (qz.my_active || 0) * 20) + '%'
  return Math.min(100, ((qz.my_active || 0) / qz.max_agent_load) * 100) + '%'
}
const breachSoon = computed(() => {
  if (!props.stats.next_breach_at) return false
  return new Date(props.stats.next_breach_at).getTime() - props.now < 3600000
})
const breachClock = computed(() => {
  if (!props.stats.next_breach_at) return '—'
  const ms = new Date(props.stats.next_breach_at).getTime() - props.now
  if (ms <= 0) return 'NOW'
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000)
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
})
const closestRow = computed(() => {
  const dued = props.rows.filter(t => t.resolution_due_at && !['resolved', 'closed'].includes(t.status))
  if (!dued.length) return null
  return [...dued].sort((a, b) => new Date(a.resolution_due_at) - new Date(b.resolution_due_at))[0]
})
const newest = computed(() => {
  if (!props.rows.length) return null
  return [...props.rows].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0]
})
</script>

<style scoped>
.ewr { display: flex; flex-direction: column; gap: 11px; }
.ewr-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.ewr-head h3 { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 15px; font-weight: 800; color: var(--sd-text); }
.ewr-head h3 svg { color: var(--sd-l3-core); }
.ewr-head span { font-size: 8.5px; letter-spacing: 0.2em; color: var(--sd-text-dim); }
.ewr-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 10px; }
.ewr-card { position: relative; display: flex; flex-direction: column; gap: 9px; padding: 13px 14px;
  border: 1px solid var(--sd-border-strong); border-radius: 14px; background: var(--sd-surface); overflow: hidden;
  transition: border-color 0.2s, transform 0.18s, box-shadow 0.2s; }
.ewr-card:hover { transform: translateY(-2px); border-color: var(--sd-l3-brd);
  box-shadow: 0 14px 30px -20px color-mix(in srgb, var(--sd-l3-core) 55%, transparent); }
.ewr-card.hot { border-color: color-mix(in srgb, var(--sd-l3-halt) 42%, var(--sd-border-strong)); }
.ewr-card.hot h5 { color: var(--sd-l3-halt); }
.ewr-card h5 { margin: 0; font-size: 8.5px; font-weight: 800; letter-spacing: 0.2em; color: var(--sd-l3-core); }

.ewr-caps { display: flex; flex-direction: column; gap: 6px; }
.ewr-cap { display: grid; grid-template-columns: minmax(0, 1fr) 84px auto; align-items: center; gap: 8px; }
.ewr-cap > span:first-child { font-size: 9px; letter-spacing: 0.06em; color: var(--sd-text-muted);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ewr-cap-bar { height: 5px; border-radius: 3px; background: color-mix(in srgb, var(--sd-text) 12%, transparent); overflow: hidden; }
.ewr-cap-bar i { display: block; height: 100%; border-radius: 3px; background: var(--sd-l3-core); transition: width 0.5s; }
.ewr-cap-bar i.full { background: var(--sd-l3-halt); }
.ewr-cap b { font-size: 10px; color: var(--sd-text-secondary); }

.ewr-big { font-size: 26px; font-weight: 800; color: var(--sd-text); letter-spacing: 0.02em; }
.ewr-card.hot .ewr-big { color: var(--sd-l3-halt); }
.ewr-gauge { display: flex; align-items: baseline; gap: 9px; }
.ewr-gauge b { font-size: 26px; font-weight: 800; color: var(--sd-text); }
.ewr-gauge b.mi { color: var(--sd-l3-halt); } .ewr-gauge b.go { color: var(--sd-l3-go); }
.ewr-gauge b.wa { color: var(--sd-l3-warn); }
.ewr-gauge span { font-size: 10.5px; color: var(--sd-text-muted); line-height: 1.45; }
.ewr-hint { font-size: 10px; color: var(--sd-text-dim); line-height: 1.5; }
.ewr-hint kbd { padding: 0 4px; border: 1px solid var(--sd-border-strong); border-radius: 3px; font-size: 8.5px;
  font-family: "Cascadia Mono", Consolas, ui-monospace, monospace; }
.ewr-jump { align-self: flex-start; margin-top: auto; padding: 6px 10px; border-radius: 8px; cursor: pointer;
  font-size: 8.5px; font-weight: 800; letter-spacing: 0.12em; font-family: inherit;
  border: 1px dashed var(--sd-l3-brd); background: transparent; color: var(--sd-l3-core); }
.ewr-jump:hover { background: var(--sd-l3-soft); }
.ewr-none { font-size: 9px; letter-spacing: 0.14em; color: var(--sd-text-dim); margin: 0; }

.ewr-duo, .ewr-quad { display: grid; gap: 8px; }
.ewr-duo { grid-template-columns: 1fr 1fr; }
.ewr-quad { grid-template-columns: 1fr 1fr; }
.ewr-duo span, .ewr-quad span { display: flex; flex-direction: column; gap: 1px; }
.ewr-duo b, .ewr-quad b { font-size: 20px; font-weight: 800; color: var(--sd-text); }
.ewr-duo b.ke { color: var(--sd-l3-halt); }
.ewr-quad b.go { color: var(--sd-l3-go); } .ewr-quad b.wa { color: var(--sd-l3-warn); }
.ewr-duo em, .ewr-quad em { font-style: normal; font-size: 7.5px; letter-spacing: 0.16em; color: var(--sd-text-dim); }

.ewr-keys { display: flex; gap: 6px; flex-wrap: wrap; }
.ewr-keys span { font-size: 9px; color: var(--sd-text-muted); }
.ewr-keys kbd { display: inline-block; min-width: 15px; padding: 1px 4px; border-radius: 4px; text-align: center;
  font-size: 8.5px; font-weight: 800; color: var(--sd-text-secondary);
  border: 1px solid var(--sd-border-strong); border-bottom-width: 2px; background: var(--sd-surface); }
</style>
