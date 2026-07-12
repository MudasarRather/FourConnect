<template>
  <section class="siw">
    <header class="siw-head">
      <h3 class="siw-title"><Landmark :size="14" /> Wall instruments</h3>
      <span class="siw-upd sd-mono">PERSONAL TELEMETRY · updated {{ updatedAgo }}s ago</span>
    </header>

    <div class="siw-grid">
      <!-- 01 workload capacity -->
      <Motion as="article" class="siw-card" v-bind="rv(0)">
        <p class="siw-t sd-mono"><BriefcaseBusiness :size="11" /> WORKLOAD CAPACITY</p>
        <p class="siw-big sd-mono">{{ stats.my_load ?? 0 }}<em v-if="capTotal"> / {{ capTotal }}</em></p>
        <div v-if="capTotal" class="siw-meter"><i :style="{ width: capPct + '%' }" :class="{ hot: capPct >= 100 }" /></div>
        <p class="siw-note">{{ capTotal ? 'Open tickets you hold vs your lane caps.' : 'Open tickets you hold — no lane caps set.' }}</p>
      </Motion>

      <!-- 02 skills match -->
      <Motion as="article" class="siw-card" v-bind="rv(1)">
        <p class="siw-t sd-mono"><Wrench :size="11" /> SKILLS MATCH</p>
        <p class="siw-big sd-mono">{{ skillsMatched }}<em> / {{ queues.length }}</em></p>
        <p class="siw-note">Lanes whose skill gate you fully hold — serve-next ranks these first.</p>
      </Motion>

      <!-- 03 next breach (ticking) -->
      <Motion as="article" class="siw-card" :class="{ alert: breachSoon }" v-bind="rv(2)">
        <p class="siw-t sd-mono"><AlarmClock :size="11" /> NEXT SLA BREACH</p>
        <p class="siw-big sd-mono">{{ nextBreachLabel }}</p>
        <p class="siw-note">Soonest resolution deadline among workable tickets on this tier.</p>
      </Motion>

      <!-- 04 drain ETA -->
      <Motion as="article" class="siw-card" v-bind="rv(3)">
        <p class="siw-t sd-mono"><Wind :size="11" /> QUEUE DRAIN ETA</p>
        <p class="siw-big sd-mono">{{ drainLabel }}</p>
        <p class="siw-note">At the current pace of {{ stats.burn_rate_hr ?? 0 }} resolves/hr (trailing 4h).</p>
      </Motion>

      <!-- 05 escalation ACK clock -->
      <Motion as="article" class="siw-card" :class="{ alert: (stats.ack_pending || 0) > 0 }" v-bind="rv(4)">
        <p class="siw-t sd-mono"><BellRing :size="11" /> ESCALATION ACK CLOCK</p>
        <p class="siw-big sd-mono">{{ stats.ack_pending ?? 0 }}<em> pending</em></p>
        <button v-if="(stats.ack_pending || 0) > 0" class="siw-cta" @click="$emit('acks')">Show them →</button>
        <p v-else class="siw-note">Every escalation on this tier has been acknowledged.</p>
      </Motion>

      <!-- 06 active swarms -->
      <Motion as="article" class="siw-card" v-bind="rv(5)">
        <p class="siw-t sd-mono"><Users :size="11" /> ACTIVE SWARMS</p>
        <p class="siw-big sd-mono">{{ stats.swarm_active ?? 0 }}</p>
        <p class="siw-note">Tickets on this tier being worked by more than one agent right now.</p>
      </Motion>

      <!-- 07 my logged time -->
      <Motion as="article" class="siw-card" v-bind="rv(6)">
        <p class="siw-t sd-mono"><Timer :size="11" /> MY LOGGED TIME TODAY</p>
        <p class="siw-big sd-mono">{{ loggedLabel }}</p>
        <button class="siw-cta" @click="$emit('worklog')">Log time →</button>
      </Motion>

      <!-- 08 watching -->
      <Motion as="article" class="siw-card" v-bind="rv(7)">
        <p class="siw-t sd-mono"><Eye :size="11" /> WATCHING</p>
        <p class="siw-big sd-mono">{{ stats.watching ?? 0 }}<em> tickets</em></p>
        <p class="siw-note">Tier tickets you follow — you're pinged on status moves and tier changes.</p>
      </Motion>

      <!-- 09 workload balance -->
      <Motion as="article" class="siw-card wide" v-bind="rv(8)">
        <p class="siw-t sd-mono"><Scale3d :size="11" /> WORKLOAD BALANCE</p>
        <div v-if="rosterBars.length" class="siw-bars">
          <div v-for="a in rosterBars" :key="a.name" class="siw-bar-row">
            <span class="siw-bar-name sd-mono">{{ a.name }}</span>
            <div class="siw-bar"><i :style="{ width: a.pct + '%' }" /></div>
            <b class="sd-mono">{{ a.n }}</b>
          </div>
        </div>
        <p v-else class="siw-note">Nobody else is on shift right now.</p>
        <p v-if="advisory" class="siw-adv sd-mono">{{ advisory.short }}</p>
      </Motion>

      <!-- 10 keyboard -->
      <Motion as="article" class="siw-card wide" v-bind="rv(9)">
        <p class="siw-t sd-mono"><Keyboard :size="11" /> KEYBOARD SHORTCUTS</p>
        <div class="siw-keys sd-mono">
          <span v-for="k in KEYS" :key="k.k" class="siw-key"><kbd>{{ k.k }}</kbd>{{ k.l }}</span>
        </div>
      </Motion>
    </div>
  </section>
</template>

<script setup>
/* SdStormInsightRail — the bureau's wall instruments: capacity, skills, breach clock,
   drain, ACK clock, swarms, my log, watching, balance, keys. Plain labels, weather scenery. */
import { computed } from 'vue'
import { Motion } from 'motion-v'
import {
  Landmark, BriefcaseBusiness, Wrench, AlarmClock, Wind, BellRing, Users, Timer, Eye,
  Scale3d, Keyboard,
} from 'lucide-vue-next'

const props = defineProps({
  stats: { type: Object, default: () => ({}) },
  queues: { type: Array, default: () => [] },
  roster: { type: Array, default: () => [] },
  advisory: { type: Object, default: null },
  updatedAgo: { type: Number, default: 0 },
  now: { type: Number, default: () => Date.now() },
})
defineEmits(['acks', 'worklog'])

const rv = (i) => ({
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  inViewOptions: { once: true, margin: '-40px' },
  transition: { duration: 0.45, delay: (i % 4) * 0.06, ease: [0.16, 1, 0.3, 1] },
})

const capTotal = computed(() => props.queues.reduce((a, q) => a + (q.max_agent_load || 0), 0))
const capPct = computed(() => (capTotal.value ? Math.min(100, Math.round(((props.stats.my_load || 0) / capTotal.value) * 100)) : 0))
const skillsMatched = computed(() => props.queues.filter(q => q.skill_match !== false).length)

const nextBreachLabel = computed(() => {
  if (!props.stats.next_breach_at) return '—'
  const ms = new Date(props.stats.next_breach_at).getTime() - props.now
  if (ms <= 0) return 'NOW'
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
})
const breachSoon = computed(() => {
  if (!props.stats.next_breach_at) return false
  return new Date(props.stats.next_breach_at).getTime() - props.now < 3600000
})
const drainLabel = computed(() => {
  const m = props.stats.drain_eta_mins
  if (m === null || m === undefined) return '—'
  const h = Math.floor(m / 60)
  return h > 0 ? `${h}h ${Math.round(m % 60)}m` : `${Math.round(m)}m`
})
const loggedLabel = computed(() => {
  const m = props.stats.my_logged_today_mins || 0
  const h = Math.floor(m / 60)
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`
})
const rosterBars = computed(() => {
  const on = props.roster.filter(a => ['online', 'focus'].includes(a.status || 'online')).slice(0, 5)
  const max = Math.max(1, ...on.map(a => a.open_count || 0))
  return on.map(a => ({
    name: (a.name || 'Agent').split(' ')[0], n: a.open_count || 0,
    pct: Math.round(((a.open_count || 0) / max) * 100),
  })).sort((a, b) => b.n - a.n)
})
const KEYS = [
  { k: 'J/K', l: 'move' }, { k: '↵', l: 'open' }, { k: 'A', l: 'assign me' }, { k: 'S', l: 'serve / skip' },
  { k: 'R', l: 'refresh / resolve' }, { k: 'E', l: 'escalate' }, { k: 'W', l: 'watch' },
  { k: 'L', l: 'log time' }, { k: 'G', l: 'swarm' }, { k: 'U', l: 'unowned' }, { k: 'Esc', l: 'stop' },
]
</script>

<style scoped>
.siw { display: flex; flex-direction: column; gap: 11px; }
.siw-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.siw-title { display: inline-flex; align-items: center; gap: 8px; margin: 0; font-size: 19px; font-weight: 800;
  letter-spacing: -0.01em; color: var(--sd-text); }
.siw-title svg { color: var(--sd-l2-core); }
.siw-upd { font-size: 9px; font-weight: 800; letter-spacing: 0.14em; color: var(--sd-text-dim); white-space: nowrap; }

.siw-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
@media (max-width: 1100px) { .siw-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 620px) { .siw-grid { grid-template-columns: 1fr; } }

.siw-card { display: flex; flex-direction: column; gap: 6px; padding: 14px 16px; border-radius: 14px;
  border: 1px solid var(--sd-border); background: var(--sd-surface); color: var(--sd-text);
  background-image: repeating-linear-gradient(112deg, var(--sd-l2-paper) 0 1px, transparent 1px 30px); }
.siw-card.wide { grid-column: span 2; }
@media (max-width: 620px) { .siw-card.wide { grid-column: span 1; } }
.siw-card.alert { border-color: color-mix(in srgb, var(--sd-l2-warn) 50%, transparent); }
.siw-t { display: inline-flex; align-items: center; gap: 6px; margin: 0; font-size: 8.5px; font-weight: 800;
  letter-spacing: 0.16em; color: var(--sd-text-dim); }
.siw-card.alert .siw-t { color: var(--sd-l2-warn); }
.siw-big { margin: 0; font-size: 24px; font-weight: 800; line-height: 1.1; font-variant-numeric: tabular-nums; }
.siw-big em { font-style: normal; font-size: 13px; color: var(--sd-text-dim); }
.siw-note { margin: 0; font-size: 10.5px; line-height: 1.45; color: var(--sd-text-muted); }
.siw-cta { align-self: flex-start; padding: 0; border: none; background: none; cursor: pointer;
  font-family: inherit; font-size: 10.5px; font-weight: 800; color: var(--sd-l2-core); }
.siw-meter { height: 6px; border-radius: 999px; overflow: hidden;
  background: color-mix(in srgb, var(--sd-text) 10%, transparent); }
.siw-meter i { display: block; height: 100%; border-radius: 999px; background: var(--sd-l2-core);
  transition: width 0.6s var(--sd-spring); }
.siw-meter i.hot { background: var(--sd-l2-halt); }

.siw-bars { display: flex; flex-direction: column; gap: 5px; }
.siw-bar-row { display: grid; grid-template-columns: 64px 1fr 22px; align-items: center; gap: 8px; }
.siw-bar-name { font-size: 9.5px; letter-spacing: 0.06em; color: var(--sd-text-secondary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.siw-bar { height: 6px; border-radius: 999px; overflow: hidden;
  background: color-mix(in srgb, var(--sd-text) 10%, transparent); }
.siw-bar i { display: block; height: 100%; border-radius: 999px; background: var(--sd-l2-front);
  transition: width 0.6s var(--sd-spring); }
.siw-bar-row b { font-size: 10px; text-align: right; }
.siw-adv { margin: 3px 0 0; font-size: 9px; font-weight: 800; letter-spacing: 0.1em; color: var(--sd-l2-warn); }

.siw-keys { display: flex; flex-wrap: wrap; gap: 7px 12px; }
.siw-key { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; color: var(--sd-text-muted); }
.siw-key kbd { display: inline-block; min-width: 16px; padding: 2px 5px; border-radius: 4px; text-align: center;
  font-family: inherit; font-size: 9px; font-weight: 800; color: var(--sd-text-secondary);
  border: 1px solid var(--sd-border-strong); border-bottom-width: 2px; background: var(--sd-surface); }
</style>
