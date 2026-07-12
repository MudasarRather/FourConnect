<template>
  <section class="egw" :style="{ '--tc': accent }" aria-label="The engineer's wall — advanced instrumentation">
    <header class="egw-head">
      <span class="egw-eyebrow sd-mono">ADVANCED INSTRUMENTATION</span>
      <h3 class="egw-title">The engineer's wall</h3>
      <p class="egw-sub">The ServiceNow-grade instruments behind this desk — every gauge reads live tier data.</p>
    </header>

    <div class="egw-grid">
      <!-- 01 · presence & capacity -->
      <Motion as="article" class="egw-card" v-bind="rv(0)">
        <span class="egw-tag sd-mono">01 · PRESENCE &amp; CAPACITY</span>
        <h4>Workload capacity</h4>
        <div class="egw-seg" role="radiogroup" aria-label="My availability">
          <button v-for="s in SEG" :key="s.key" class="egw-seg-b" :class="{ on: myStatus === s.key }"
            role="radio" :aria-checked="myStatus === s.key" :title="s.blurb" @click="$emit('status', s.key)">
            {{ s.label }}
          </button>
        </div>
        <div class="egw-fuelbar" aria-hidden="true"><b :style="{ transform: `scaleX(${fuelFrac})` }" :class="{ full: fuelFrac >= 1 }" /></div>
        <div class="egw-cols sd-mono">
          <span>WIP {{ stats.my_load ?? 0 }}<template v-if="capTotal"> / {{ capTotal }}</template> slots</span>
          <span>serve-next respects capacity</span>
        </div>
      </Motion>

      <!-- 02 · skills match -->
      <Motion as="article" class="egw-card" v-bind="rv(1)">
        <span class="egw-tag sd-mono">02 · SKILLS MATCH</span>
        <h4>Skills match</h4>
        <div v-if="tierSkills.length" class="egw-skills">
          <span v-for="s in tierSkills" :key="s.id" class="egw-skill sd-mono" :class="{ miss: !s.mine }">{{ s.name }} {{ s.mine ? '✓' : '✗' }}</span>
        </div>
        <p v-else class="egw-note sd-mono">No skills gate this tier's queues — every ticket matches your skill set.</p>
        <p v-if="tierSkills.length" class="egw-note sd-mono">Skill-matched queues serve first; mismatches stay reachable.</p>
      </Motion>

      <!-- 03 · breach forecast -->
      <Motion as="article" class="egw-card" v-bind="rv(2)">
        <span class="egw-tag sd-mono">03 · BREACH FORECAST</span>
        <h4>Next SLA breach</h4>
        <span class="egw-big sd-mono" :class="{ hot: breachHot }">{{ breachIn }}</span>
        <div class="egw-horizon" aria-hidden="true">
          <span v-for="(d, i) in horizon" :key="i" class="egw-dot" :class="d.tone" :style="{ left: d.left }" />
        </div>
        <p class="egw-note sd-mono">{{ breachNote }}</p>
      </Motion>

      <!-- 04 · drain eta -->
      <Motion as="article" class="egw-card" v-bind="rv(3)">
        <span class="egw-tag sd-mono">04 · DRAIN ETA</span>
        <h4>Queue drain ETA</h4>
        <div class="egw-drain">
          <span class="egw-grade sd-mono" :class="`g-${stats.health || 'green'}`">{{ gradeOf }}</span>
          <div class="egw-drain-txt">
            <b class="sd-mono">{{ drainTxt }}</b>
            <i class="sd-mono">at current pace · {{ stats.burn_rate_hr ?? 0 }} tickets/hr</i>
          </div>
        </div>
      </Motion>

      <!-- 05 · workload rebalancer -->
      <Motion as="article" class="egw-card" v-bind="rv(4)">
        <span class="egw-tag sd-mono">05 · WORKLOAD REBALANCER</span>
        <h4>Workload balance</h4>
        <div v-if="loadBars.length" class="egw-loads">
          <div v-for="a in loadBars" :key="a.user_id" class="egw-load">
            <span class="egw-load-nm">{{ firstName(a.name) }}</span>
            <span class="egw-load-bar"><b :style="{ transform: `scaleX(${a.frac})` }" :class="{ hot: a.hot }" /></span>
            <b class="sd-mono">{{ a.open_count ?? 0 }}</b>
          </div>
        </div>
        <p class="egw-note sd-mono">{{ advisory ? advisory.long : 'Load is level across the team — nothing to move.' }}</p>
      </Motion>

      <!-- 06 · live presence -->
      <Motion as="article" class="egw-card" v-bind="rv(5)">
        <span class="egw-tag sd-mono">06 · LIVE PRESENCE</span>
        <h4>Being viewed now</h4>
        <div v-if="ghosts.length" class="egw-ghosts">
          <button v-for="g in ghosts" :key="g.id" class="egw-ghost sd-mono" :title="'Open ' + g.ticket_number" @click="$emit('open', g)">
            <span class="egw-ghost-mono">{{ initials(g.viewing[0]) }}</span>
            {{ g.ticket_number }} · {{ g.viewing[0] }} viewing
          </button>
        </div>
        <p v-else class="egw-note sd-mono">No tickets open on a teammate's screen right now.</p>
        <p class="egw-note sd-mono">Viewed tickets show hatched on the board — serve-next skips past them.</p>
      </Motion>

      <!-- 07 · keyboard triage -->
      <Motion as="article" class="egw-card" v-bind="rv(6)">
        <span class="egw-tag sd-mono">07 · KEYBOARD TRIAGE</span>
        <h4>Keyboard shortcuts</h4>
        <div class="egw-keys">
          <span v-for="k in KEYS" :key="k.key" class="egw-key"><kbd class="sd-mono">{{ k.key }}</kbd><i>{{ k.label }}</i></span>
        </div>
      </Motion>

      <!-- 08 · shift handoff -->
      <Motion as="article" class="egw-card" v-bind="rv(7)">
        <span class="egw-tag sd-mono">08 · SHIFT HANDOFF</span>
        <h4>My shift summary</h4>
        <div class="egw-stint">
          <span class="egw-stat"><b class="sd-mono">{{ stint.served ?? 0 }}</b><i>SERVED</i></span>
          <span class="egw-stat"><b class="sd-mono ok">{{ stats.my_resolved_today ?? 0 }}</b><i>RESOLVED</i></span>
          <span class="egw-stat"><b class="sd-mono" :class="{ warn: (stats.skips_today || 0) > 3 }">{{ stats.skips_today ?? 0 }}</b><i>SKIPPED</i></span>
          <span class="egw-stat"><b class="sd-mono save">{{ stats.my_breach_saves_today ?? 0 }}</b><i>SLA SAVES</i></span>
        </div>
      </Motion>

      <!-- 09 · macros -->
      <Motion as="article" class="egw-card" v-bind="rv(8)">
        <span class="egw-tag sd-mono">09 · MACROS</span>
        <h4>Quick actions</h4>
        <p class="egw-note sd-mono">Canned next-steps — one tap on the ticket you're currently serving.</p>
        <div class="egw-macros">
          <button class="egw-macro" title="Open the console on the reply composer for the served ticket" @click="$emit('crew', 'reply')">
            <MessageSquareText :size="12" /> Reply to requester
          </button>
          <button class="egw-macro" title="Ask for info — served ticket moves to Pending customer" @click="$emit('crew', 'pending')">
            <CircleHelp :size="12" /> Request info pack
          </button>
        </div>
      </Motion>

      <!-- 10 · live wire -->
      <Motion as="article" class="egw-card" v-bind="rv(9)">
        <span class="egw-tag sd-mono">10 · LIVE WIRE</span>
        <h4>Live board feed</h4>
        <div class="egw-wire" aria-hidden="true"><b :class="{ fresh: updatedAgo <= 8 }" /></div>
        <p class="egw-note sd-mono up">
          <template v-if="newestRow">NEWEST · {{ newestRow.ticket_number }} → SERVE POSITION {{ newestPos }} · </template>
          BOARD UPDATED {{ updatedAgo }}S AGO
        </p>
      </Motion>
    </div>
  </section>
</template>

<script setup>
/* SdEngineersWall — the artifact's "Section 04" made real: eight instrument cards
   reading live tier data (fuel/WIP, setup sheet, breach horizon, drain grade,
   crew load bars, ghost-livery presence, wheel controls, stint report). */
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { MessageSquareText, CircleHelp } from 'lucide-vue-next'

const props = defineProps({
  stats: { type: Object, default: () => ({}) },
  queues: { type: Array, default: () => [] },
  rows: { type: Array, default: () => [] },
  roster: { type: Array, default: () => [] },
  advisory: { type: Object, default: null },
  stint: { type: Object, default: () => ({}) },
  updatedAgo: { type: Number, default: 0 },
  now: { type: Number, default: () => Date.now() },
  accent: { type: String, default: 'var(--sd-qs-core)' },
})
defineEmits(['open', 'status', 'crew'])

/* availability segmented toggle (artifact card 01) */
const SEG = [
  { key: 'online', label: 'AVAILABLE', blurb: 'Receiving work' },
  { key: 'focus', label: 'BUSY', blurb: 'Heads-down — still serving' },
  { key: 'away', label: 'AWAY', blurb: 'No deals while away' },
]
const myStatus = computed(() => props.stats.my_status || 'online')

/* live wire: newest arrival + its serve-order position */
const newestRow = computed(() => {
  const rs = [...(props.rows || [])].filter(t => t.created_at)
  rs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  return rs[0] || null
})
const newestPos = computed(() => {
  if (!newestRow.value) return 0
  return (props.rows || []).findIndex(t => t.id === newestRow.value.id) + 1
})

const rv = (i) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  inViewOptions: { once: true, margin: '-40px' },
  transition: { duration: 0.45, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] },
})

/* 01 fuel */
const capTotal = computed(() => (props.queues || []).reduce((a, q) => a + (q.max_agent_load || 0), 0))
const fuelFrac = computed(() => {
  if (!capTotal.value) return Math.min(1, (props.stats.my_load || 0) / 5)
  return Math.min(1, (props.stats.my_load || 0) / capTotal.value)
})

/* 02 setup sheet — union of the tier lanes' skills */
const tierSkills = computed(() => {
  const seen = new Map()
  for (const q of props.queues || []) for (const s of (q.skills || [])) if (!seen.has(s.id)) seen.set(s.id, s)
  return [...seen.values()]
})

/* 03 breach forecast */
const breachIn = computed(() => {
  const at = props.stats.next_breach_at ? new Date(props.stats.next_breach_at).getTime() : 0
  if (!at) return (props.stats.breached || 0) > 0 ? 'ON TRACK' : '—'
  const s = Math.max(0, Math.round((at - props.now) / 1000))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${m}:${String(ss).padStart(2, '0')}`
})
const breachHot = computed(() => {
  const at = props.stats.next_breach_at ? new Date(props.stats.next_breach_at).getTime() : 0
  return (props.stats.breached || 0) > 0 || (at && at - props.now < 3600e3)
})
const firstDue = computed(() => {
  const withDue = (props.rows || []).filter(t => t.resolution_due_at && new Date(t.resolution_due_at).getTime() > props.now)
  withDue.sort((a, b) => new Date(a.resolution_due_at) - new Date(b.resolution_due_at))
  return withDue[0] || null
})
const breachNote = computed(() => {
  if ((props.stats.breached || 0) > 0 && !props.stats.next_breach_at) return `${props.stats.breached} already breached.`
  return firstDue.value ? `Breach horizon — ${firstDue.value.ticket_number} breaches first.` : 'No live deadlines on this page.'
})
/* horizon dots: each row's due time positioned across the next 8h */
const horizon = computed(() => {
  const H = 8 * 3600e3
  return (props.rows || [])
    .filter(t => t.resolution_due_at)
    .map(t => {
      const d = new Date(t.resolution_due_at).getTime() - props.now
      const frac = Math.max(0, Math.min(1, d / H))
      return { left: `${(frac * 100).toFixed(1)}%`, tone: d < 0 ? 'bad' : d < 4 * 3600e3 ? 'warn' : 'ok' }
    })
    .slice(0, 24)
})

/* 04 drain */
const gradeOf = computed(() => ({ green: 'A', amber: 'C', red: 'E' }[props.stats.health] || 'A'))
const drainTxt = computed(() => {
  const m = props.stats.drain_eta_mins
  if (m == null) return (props.stats.burn_rate_hr || 0) > 0 ? 'queue clear' : 'no resolves yet'
  return m < 60 ? `~${Math.round(m)}m` : m < 1440 ? `~${Math.floor(m / 60)}h ${Math.round(m % 60)}m` : `~${(m / 1440).toFixed(1)}d`
})

/* 05 rebalancer */
const loadBars = computed(() => {
  const online = (props.roster || []).filter(a => ['online', 'focus'].includes(a.status || 'online'))
  const sorted = [...online].sort((a, b) => (b.open_count || 0) - (a.open_count || 0)).slice(0, 4)
  const max = Math.max(1, ...sorted.map(a => a.open_count || 0))
  return sorted.map(a => ({ ...a, frac: (a.open_count || 0) / max, hot: (a.open_count || 0) >= 5 }))
})
const firstName = (n) => (n || 'Agent').split(' ')[0]
const initials = (n) => (n || 'A').split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase()

/* 06 ghosts */
const ghosts = computed(() => (props.rows || []).filter(t => (t.viewing || []).length).slice(0, 4))

const KEYS = [
  { key: 'J', label: 'NEXT' }, { key: 'K', label: 'PREV' }, { key: '↵', label: 'OPEN' },
  { key: 'A', label: 'ASSIGN' }, { key: 'S', label: 'SERVE / SKIP' }, { key: 'R', label: 'RESOLVE' },
  { key: 'E', label: 'ESCALATE' }, { key: 'U', label: 'UNOWNED' }, { key: 'ESC', label: 'STOP' },
]
</script>

<style scoped>
.egw { display: flex; flex-direction: column; gap: 14px; margin-top: 6px; }
.egw-head { display: flex; flex-direction: column; gap: 3px; }
.egw-eyebrow { font-size: 9px; font-weight: 800; letter-spacing: 0.24em; color: var(--tc); }
.egw-title { margin: 0; font-size: clamp(18px, 2.2vw, 24px); font-weight: 800;
  text-transform: uppercase; letter-spacing: -0.01em; color: var(--sd-text); }
.egw-sub { margin: 0; font-size: 11.5px; color: var(--sd-text-muted); }

.egw-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 10px; align-items: stretch; }
.egw-card { display: flex; flex-direction: column; gap: 8px; padding: 14px 15px; border-radius: 14px;
  border: 1px solid var(--sd-border); background: var(--sd-surface);
  transition: border-color 0.2s, transform 0.18s, box-shadow 0.2s; }
.egw-card:hover { border-color: color-mix(in srgb, var(--tc) 45%, var(--sd-border)); transform: translateY(-2px);
  box-shadow: 0 14px 30px -18px color-mix(in srgb, var(--tc) 50%, transparent); }
.egw-tag { font-size: 8.5px; font-weight: 800; letter-spacing: 0.2em; color: var(--tc); }
.egw-card h4 { margin: 0; font-size: 15px; font-weight: 800; text-transform: uppercase;
  letter-spacing: 0.01em; color: var(--sd-text); }
.egw-note { margin: 0; font-size: 9.5px; line-height: 1.55; color: var(--sd-text-dim); }
.egw-note.up { letter-spacing: 0.08em; }
.egw-cols { display: flex; justify-content: space-between; gap: 10px; font-size: 9px; color: var(--sd-text-dim); }

/* availability segmented toggle */
.egw-seg { display: inline-flex; padding: 3px; border-radius: 10px; border: 1px solid var(--sd-border-strong);
  background: color-mix(in srgb, var(--sd-text) 4%, transparent); width: fit-content; }
.egw-seg-b { padding: 6px 12px; border: none; border-radius: 8px; cursor: pointer; font-family: var(--sd-font-mono, ui-monospace);
  font-size: 9px; font-weight: 800; letter-spacing: 0.08em; background: transparent; color: var(--sd-text-muted);
  transition: background 0.2s, color 0.2s; }
.egw-seg-b.on { color: #052e1f; background: linear-gradient(135deg, #6ee7b7, var(--sd-qs-go)); }
.egw-seg-b:not(.on):hover { color: var(--sd-text); }

/* macros */
.egw-macros { display: flex; flex-direction: column; gap: 7px; align-items: flex-start; }
.egw-macro { display: inline-flex; align-items: center; gap: 7px; padding: 8px 13px; border-radius: 9px;
  font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text-secondary);
  transition: border-color 0.2s, color 0.2s; }
.egw-macro:hover { border-color: var(--tc); color: var(--sd-text); }

/* live wire */
.egw-wire { height: 10px; border-radius: 6px; overflow: hidden; border: 1px solid var(--sd-border);
  background: color-mix(in srgb, var(--sd-text) 4%, transparent); position: relative; }
.egw-wire b { position: absolute; top: 0; bottom: 0; width: 40%; border-radius: 6px;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--tc) 55%, transparent), transparent);
  animation: egw-wire 2.6s linear infinite; }
.egw-wire b.fresh { background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--sd-qs-go) 65%, transparent), transparent); }

.egw-fuelbar { height: 8px; border-radius: 5px; overflow: hidden; background: color-mix(in srgb, var(--sd-text) 8%, transparent); }
.egw-fuelbar b { display: block; height: 100%; border-radius: 5px; transform-origin: left;
  background: linear-gradient(90deg, var(--sd-qs-go), var(--sd-qs-warn)); transition: transform 0.6s var(--sd-spring, ease); }
.egw-fuelbar b.full { background: var(--sd-qs-halt); }

.egw-skills { display: flex; gap: 6px; flex-wrap: wrap; }
.egw-skill { padding: 3px 8px; border-radius: 7px; font-size: 9px; font-weight: 800;
  color: var(--sd-qs-go); border: 1px solid color-mix(in srgb, var(--sd-qs-go) 45%, transparent); }
.egw-skill.miss { color: var(--sd-qs-halt); border-color: color-mix(in srgb, var(--sd-qs-halt) 45%, transparent); }

.egw-big { font-size: 26px; font-weight: 800; line-height: 1; color: var(--sd-qs-warn); font-variant-numeric: tabular-nums; }
.egw-big.hot { color: var(--sd-qs-halt); }
.egw-horizon { position: relative; height: 10px; border-radius: 5px; margin-top: 2px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--sd-qs-go) 30%, transparent),
    color-mix(in srgb, var(--sd-qs-warn) 30%, transparent) 55%, color-mix(in srgb, var(--sd-qs-halt) 30%, transparent)); }
.egw-dot { position: absolute; top: 50%; width: 6px; height: 6px; border-radius: 50%; transform: translate(-50%, -50%); }
.egw-dot.ok { background: var(--sd-qs-go); }
.egw-dot.warn { background: var(--sd-qs-warn); }
.egw-dot.bad { background: var(--sd-qs-halt); }

.egw-drain { display: flex; align-items: center; gap: 12px; }
.egw-grade { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 12px;
  font-size: 22px; font-weight: 800; font-style: italic; }
.egw-grade.g-green { color: var(--sd-qs-go); border: 2px solid color-mix(in srgb, var(--sd-qs-go) 55%, transparent); }
.egw-grade.g-amber { color: var(--sd-qs-warn); border: 2px solid color-mix(in srgb, var(--sd-qs-warn) 55%, transparent); }
.egw-grade.g-red { color: var(--sd-qs-halt); border: 2px solid color-mix(in srgb, var(--sd-qs-halt) 55%, transparent); }
.egw-drain-txt { display: flex; flex-direction: column; gap: 2px; }
.egw-drain-txt b { font-size: 17px; font-weight: 800; color: var(--sd-text); }
.egw-drain-txt i { font-style: normal; font-size: 9px; color: var(--sd-text-dim); }

.egw-loads { display: flex; flex-direction: column; gap: 6px; }
.egw-load { display: grid; grid-template-columns: 54px 1fr 22px; align-items: center; gap: 8px; }
.egw-load-nm { font-size: 10.5px; font-weight: 700; color: var(--sd-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.egw-load-bar { height: 6px; border-radius: 4px; overflow: hidden; background: color-mix(in srgb, var(--sd-text) 8%, transparent); }
.egw-load-bar b { display: block; height: 100%; border-radius: 4px; transform-origin: left; background: var(--sd-qs-go);
  transition: transform 0.6s var(--sd-spring, ease); }
.egw-load-bar b.hot { background: var(--sd-qs-halt); }
.egw-load > b { font-size: 10px; font-weight: 800; text-align: right; color: var(--sd-text-secondary); }

.egw-ghosts { display: flex; flex-direction: column; gap: 6px; }
.egw-ghost { display: inline-flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 9px;
  font-size: 9.5px; font-weight: 700; cursor: pointer; text-align: left; font-family: inherit;
  color: var(--sd-text-secondary); border: 1px dashed var(--sd-border-strong);
  background: repeating-linear-gradient(45deg, transparent 0 6px, color-mix(in srgb, var(--sd-text) 3%, transparent) 6px 12px); }
.egw-ghost:hover { border-color: var(--tc); color: var(--sd-text); }
.egw-ghost-mono { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%;
  font-size: 8px; font-weight: 800; color: #241703; background: linear-gradient(135deg, #ffd98a, var(--sd-qs-core)); }

.egw-keys { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.egw-key { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.egw-key kbd { display: grid; place-items: center; min-width: 30px; padding: 6px 8px; border-radius: 8px;
  font-size: 11px; font-weight: 800; color: var(--sd-text);
  border: 1px solid var(--sd-border-strong); border-bottom-width: 3px; background: var(--sd-surface); }
.egw-key i { font-style: normal; font-size: 7.5px; font-weight: 800; letter-spacing: 0.1em; color: var(--sd-text-dim); }

.egw-stint { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.egw-stat { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 9px 6px;
  border-radius: 10px; border: 1px solid var(--sd-border); }
.egw-stat b { font-size: 18px; font-weight: 800; color: var(--sd-text); font-variant-numeric: tabular-nums; }
.egw-stat b.ok { color: var(--sd-qs-go); }
.egw-stat b.warn { color: var(--sd-qs-warn); }
.egw-stat b.save { color: var(--sd-qs-halt); }
.egw-stat i { font-style: normal; font-size: 7.5px; font-weight: 800; letter-spacing: 0.16em; color: var(--sd-text-dim); }

@keyframes egw-wire { 0% { left: -40%; } 100% { left: 100%; } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .egw-wire b { animation: none; left: 30%; }
}
</style>
