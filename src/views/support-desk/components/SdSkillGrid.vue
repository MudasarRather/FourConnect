<template>
  <div class="cg">
    <!-- ═══ instrument bar ═══ -->
    <header class="cg-bar">
      <span class="cg-bar-sig sd-mono"
        title="The live agent × skill clearance matrix — lanes that demand skills only auto-assign agents certified in ALL of them, and fail open to the crew.">
        <ShieldCheck :size="12" /> CERTIFICATION GRID
      </span>
      <span class="cg-bar-note sd-mono">AGENT × SKILL CLEARANCE MATRIX · CLICK A CELL — CERTIFY / REVOKE LIVE</span>
      <span class="cg-sp" />
      <span class="cg-bar-tele sd-mono" aria-label="Coverage telemetry">
        <em><b><SdCountUp :value="cols.length" /></b> SKILLS</em>
        <em class="go"><b><SdCountUp :value="certTotal" /></b> CERTS</em>
        <em class="warn" :class="{ zero: !soloCount }"><b><SdCountUp :value="soloCount" /></b> AT RISK</em>
        <em class="halt" :class="{ zero: !gapCount }"><b><SdCountUp :value="gapCount" /></b> GAPS</em>
      </span>
      <Motion as="button" class="cg-new" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.96 }" @click="$emit('new')">
        <Plus :size="13" /> Mint a skill
      </Motion>
    </header>

    <!-- ═══ the board ═══ -->
    <div class="cg-board">
      <span class="cg-floor" aria-hidden="true" />

      <!-- empty vault — no skills minted yet -->
      <div v-if="!cols.length" class="cg-empty">
        <span class="cg-empty-socket" aria-hidden="true"><i class="s1" /><i class="s2" /><i class="s3" /></span>
        <p class="sd-mono">NO SKILLS MINTED</p>
        <span>Routing is team-wide — every agent looks the same to the assignment engine.
          Mint the first skill to start certifying the crew.</span>
        <Motion as="button" class="cg-new ghost" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.96 }" @click="$emit('new')">
          <Plus :size="13" /> Mint the first skill
        </Motion>
      </div>

      <div v-else class="cg-scroll" @pointerleave="hov = { r: -1, c: -1 }">
        <div class="cg-grid" :style="gridStyle" role="grid" aria-label="Agent by skill certification matrix">
          <span class="cg-beam" aria-hidden="true" />

          <!-- corner -->
          <div class="cg-corner sd-mono">
            <span class="ax"><Users :size="10" /> CREW ↓</span>
            <span class="ax"><Sparkles :size="10" /> SKILLS →</span>
          </div>

          <!-- skill totems (column heads) -->
          <button v-for="(col, c) in cols" :key="'h' + col.id" type="button" class="cg-colh"
            :class="{ hl: hov.c === c, off: !col.active, gap: col.gap }"
            :style="{ '--c': c, '--sc': col.color || 'var(--cg-core)' }"
            :title="`Edit ${col.name}`" @pointerenter="hov = { r: -1, c }" @click="$emit('edit', col.id)">
            <span class="cg-colh-ring">
              <svg viewBox="0 0 30 30" aria-hidden="true">
                <circle class="bg" cx="15" cy="15" r="12.5" />
                <circle class="fg" cx="15" cy="15" r="12.5"
                  :style="{ strokeDashoffset: 78.5 - 78.5 * (rows.length ? col.holderN / rows.length : 0) }" />
              </svg>
              <b class="sd-mono">{{ col.holderN }}</b>
            </span>
            <b class="cg-colh-name">{{ col.name }}</b>
            <span v-if="col.code" class="cg-colh-code sd-mono">{{ col.code }}</span>
            <span class="cg-colh-demand sd-mono" :class="{ dim: !col.demandN }"
              :title="col.demandN ? 'Required by: ' + col.demand.map(q => q.name).join(', ') : 'No lane requires this skill yet'">
              <Inbox :size="9" /> {{ col.demandN ? `${col.demandN} lane${col.demandN === 1 ? '' : 's'}` : 'unwired' }}
            </span>
            <span v-if="!col.active" class="cg-tag off sd-mono">PAUSED</span>
            <span v-else-if="col.gap" class="cg-tag gap sd-mono">NO HOLDER</span>
            <Pencil :size="10" class="cg-colh-pen" aria-hidden="true" />
          </button>

          <!-- crew rows -->
          <template v-for="(row, r) in rows" :key="'r' + row.id">
            <div class="cg-rowh" :class="{ hl: hov.r === r, zero: !row.certs }" :style="{ '--r': r }"
              @pointerenter="hov = { r, c: -1 }">
              <span class="cg-ava sd-mono" aria-hidden="true">{{ row.initials }}</span>
              <span class="cg-rowh-b">
                <b :title="row.name">{{ row.name }}</b>
                <i class="cg-meter" aria-hidden="true"><i :style="{ width: (cols.length ? (row.certs / cols.length) * 100 : 0) + '%' }" /></i>
              </span>
              <b class="cg-rowh-n sd-mono" :title="`${row.certs} certification${row.certs === 1 ? '' : 's'}`">{{ row.certs }}</b>
            </div>

            <button v-for="(col, c) in cols" :key="row.id + col.id" type="button" class="cg-cell"
              :class="{
                on: col.holders.has(row.id), pending: pendingSet.has(col.id),
                hlr: hov.r === r, hlc: hov.c === c,
                pop: popKey === col.id + ':' + row.id,
              }"
              :style="{ '--w': Math.min(r + c, 18), '--sc': col.color || 'var(--cg-core)', '--fd': flareDelay(c) }"
              :aria-pressed="col.holders.has(row.id)"
              :aria-label="`${row.name} — ${col.name}: ${col.holders.has(row.id) ? 'certified' : 'not certified'}`"
              :title="`${row.name} — ${col.name} · ${col.holders.has(row.id) ? 'certified — click to revoke' : 'click to certify'}`"
              @pointerenter="hov = { r, c }" @click="clickCell(col, row)">
              <span class="cg-dot" aria-hidden="true"><Check :size="9" class="tick" /></span>
            </button>
          </template>

          <!-- crew missing entirely -->
          <div v-if="!rows.length" class="cg-nocrew sd-mono" :style="{ gridColumn: `1 / span ${cols.length + 1}` }">
            NO SUPPORT AGENTS ON THE DESK YET — FLAG AGENTS FROM TEAM COMMAND, THEN CERTIFY THEM HERE.
          </div>
        </div>
      </div>

      <footer v-if="cols.length" class="cg-legend sd-mono" aria-hidden="true">
        <span><i class="dot on" /> CERTIFIED</span>
        <span><i class="dot" /> NOT CERTIFIED</span>
        <span class="cg-sp" />
        <span class="dim">EVERY FLIP WRITES THE ROSTER LIVE · AUDITED TO THE LEDGER</span>
      </footer>
    </div>

    <!-- ═══ coverage intelligence ═══ -->
    <div v-if="alerts.length" class="cg-intel">
      <Motion v-for="(a, i) in alerts" :key="a.id" as="article" class="cg-alert" :class="a.kind"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.45, delay: 0.1 + i * 0.07, ease: [0.16, 1, 0.3, 1] }">
        <span class="cg-lamp" :class="a.kind" aria-hidden="true" />
        <header class="sd-mono"><component :is="a.icon" :size="11" /> {{ a.title }}</header>
        <p>{{ a.body }}</p>
        <div v-if="a.skillChips || a.laneChips" class="cg-alert-chips">
          <button v-for="s in a.skillChips || []" :key="'s' + s.id" type="button" class="cg-chip skill"
            :style="{ '--sc': s.color || 'var(--cg-core)' }" :title="`Edit ${s.name}`" @click="$emit('edit', s.id)">
            <Sparkles :size="9" /> {{ s.name }}
          </button>
          <button v-for="q in a.laneChips || []" :key="'q' + q.id" type="button" class="cg-chip lane"
            :title="`Open lane ${q.name}`" @click="$emit('lane', q.id)">
            <Inbox :size="9" /> {{ q.name }}
          </button>
        </div>
      </Motion>
    </div>
  </div>
</template>

<script setup>
/*
  SdSkillGrid — "THE CERTIFICATION GRID", the Queue-Config Skills panel's signature
  instrument. A mission-control crew-clearance board: agents down the side, skills
  across the top, every cell a live certification diode. Click a diode → the section
  PATCHes the skill roster (optimistic, per-skill locked). A scan beam sweeps the
  board; certified diodes flare as it passes. Below, the coverage-intelligence deck
  surfaces the routing loopholes: demanded skills nobody (active) holds fail open to
  the whole crew, single-holder skills are bus-factor-1, unwired skills gate nothing.
  Unlike the hero's dark DAG stage, the grid sits on the panel's theme-aware glass
  surfaces (--cg-* aliases the --sd-qc- and --sd- tokens) — cream in light mode, so it
  never reads as a second black console under the hero.
*/
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import {
  ShieldCheck, Sparkles, Users, Inbox, Plus, Pencil, Check,
  TriangleAlert, Link2, UserRound,
} from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'

const props = defineProps({
  skills: { type: Array, default: () => [] },     // enriched SkillResponse rows
  agents: { type: Array, default: () => [] },     // [{ value, label }] — the agent pool
  queues: { type: Array, default: () => [] },     // lanes (skill demand comes from skill_ids)
  busySkills: { type: Array, default: () => [] }, // skill ids with a PATCH in flight
})
const emit = defineEmits(['new', 'edit', 'toggle', 'lane'])

const hov = ref({ r: -1, c: -1 })
const popKey = ref('')
let popTimer = 0

const initials = (n) => (n || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()

const cols = computed(() => props.skills.map((s) => {
  const holders = new Set((s.agent_ids || []).map(String))
  const demand = props.queues.filter(q => (q.skill_ids || []).map(String).includes(String(s.id)))
  const active = s.is_active !== false
  const holderN = (s.agents || []).length
  return {
    id: String(s.id), name: s.name, code: s.code, color: s.color || '',
    active, holders, holderN, demand, demandN: demand.length,
    firstHolder: (s.agents || [])[0]?.name || '',
    /* a demanded skill that can't be satisfied — paused skills don't count toward
       lane requirements (the matcher only reads active skills) */
    gap: demand.length > 0 && (!active || holderN === 0),
    solo: demand.length > 0 && active && holderN === 1,
  }
}))

const rows = computed(() => props.agents.map((a) => {
  const id = String(a.value)
  return {
    id, name: a.label || '?', initials: initials(a.label),
    certs: cols.value.reduce((n, c) => n + (c.holders.has(id) ? 1 : 0), 0),
  }
}))

const certTotal = computed(() => cols.value.reduce((n, c) => n + c.holderN, 0))
const gapCount = computed(() => cols.value.filter(c => c.gap).length)
const soloCount = computed(() => cols.value.filter(c => c.solo).length)
const pendingSet = computed(() => new Set(props.busySkills.map(String)))

const gridStyle = computed(() => ({
  gridTemplateColumns: `226px repeat(${cols.value.length || 1}, minmax(78px, 1fr))`,
}))

/* the scan beam crosses the board every 9s — certified diodes flare in column
   order on the same period, so the wave reads as the beam exciting them */
const flareDelay = (c) => `${(((c + 1) / (cols.value.length + 2)) * 9).toFixed(2)}s`

const clickCell = (col, row) => {
  if (pendingSet.value.has(col.id)) return
  popKey.value = `${col.id}:${row.id}`
  clearTimeout(popTimer)
  popTimer = setTimeout(() => { popKey.value = '' }, 650)
  emit('toggle', col.id, row.id)
}

/* ── the coverage-intelligence deck ── */
const alerts = computed(() => {
  const out = []
  cols.value.forEach((c) => {
    if (c.gap) {
      out.push({
        id: 'gap:' + c.id, kind: 'halt', icon: TriangleAlert,
        title: c.active ? 'COVERAGE GAP' : 'PAUSED BUT STILL DEMANDED',
        body: c.active
          ? `Nobody is certified in ${c.name}, so its lane requirement can never be met — those lanes fail open and auto-assign from the whole crew.`
          : `${c.name} is paused — holders don't count while it sleeps, so the lanes demanding it fail open to the whole crew. Reactivate it or unwire it.`,
        skillChips: [c], laneChips: c.demand,
      })
    } else if (c.solo) {
      out.push({
        id: 'solo:' + c.id, kind: 'warn', icon: UserRound,
        title: 'BUS FACTOR 1',
        body: `${c.name} rides on a single agent${c.firstHolder ? ` — ${c.firstHolder}` : ''}. One sick day and its lanes fail open. Certify a backup.`,
        skillChips: [c], laneChips: c.demand,
      })
    }
  })
  const unwired = cols.value.filter(c => c.demandN === 0)
  if (unwired.length) {
    out.push({
      id: 'unwired', kind: 'dim', icon: Link2,
      title: `UNWIRED SKILL${unwired.length === 1 ? '' : 'S'}`,
      body: `Certifies agents but gates no routing — wire ${unwired.length === 1 ? 'it' : 'them'} into a lane's requirements (Lanes panel) to put the certification to work.`,
      skillChips: unwired,
    })
  }
  const untrained = rows.value.filter(r => !r.certs)
  if (untrained.length && cols.value.length) {
    out.push({
      id: 'untrained', kind: 'dim', icon: Users,
      title: 'UNCERTIFIED CREW',
      body: `${untrained.length} agent${untrained.length === 1 ? ' holds' : 's hold'} no certifications yet: ${untrained.slice(0, 5).map(r => r.name).join(', ')}${untrained.length > 5 ? ` +${untrained.length - 5} more` : ''}. They still serve unskilled lanes — and skilled lanes when those fail open.`,
    })
  }
  if (!out.some(a => a.kind !== 'dim') && cols.value.some(c => c.demandN > 0)) {
    out.unshift({
      id: 'clear', kind: 'go', icon: ShieldCheck,
      title: 'FULL COVERAGE',
      body: 'Every demanded skill has at least two certified holders — no lane on the floor can be starved or stranded on one pair of hands.',
    })
  }
  return out
})
</script>

<style scoped>
/* ═══ theme-aware surfaces — the hero above owns the dark stage; the grid lives on
   the panel's glass so it reads as a different instrument (and flips to cream in
   light mode). --cg-face is the SOLID face for the sticky axes — translucent
   surfaces would let cells ghost through while scrolling. ═══ */
.cg {
  --cg-core: var(--sd-qc-core);
  --cg-hi: var(--sd-qc-hi);
  --cg-ink: var(--sd-text);
  --cg-dim: var(--sd-text-muted);
  --cg-line: var(--sd-border);
  --cg-brd: var(--sd-qc-brd);
  --cg-soft: var(--sd-qc-soft);
  --cg-go: var(--sd-qc-go);
  --cg-warn: var(--sd-qc-warn);
  --cg-halt: var(--sd-qc-halt);
  --cg-face: #191c20;
  --cg-face-hi: #22262b;
  --cg-hair: color-mix(in srgb, var(--cg-core) 9%, transparent);
  display: flex; flex-direction: column; gap: 12px;
}
[data-theme="light"] .cg {
  --cg-face: #fffdf8;
  --cg-face-hi: #fbf2e2;
  --cg-hair: color-mix(in srgb, var(--cg-core) 16%, transparent);
}
.cg-sp { flex: 1; }

/* ═══ instrument bar ═══ */
.cg-bar {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 11px 16px; border-radius: 14px;
  background: var(--sd-surface-glass);
  border: 1px solid var(--cg-line);
  backdrop-filter: blur(10px);
}
.cg-bar-sig { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 800;
  letter-spacing: 0.14em; color: var(--cg-core); cursor: help; }
.cg-bar-note { font-size: 9px; letter-spacing: 0.1em; color: var(--cg-dim); }
.cg-bar-tele { display: inline-flex; gap: 14px; font-size: 9px; letter-spacing: 0.08em; color: var(--cg-dim); }
.cg-bar-tele em { font-style: normal; display: inline-flex; align-items: baseline; gap: 5px; }
.cg-bar-tele b { font-size: 13px; color: var(--cg-ink); }
.cg-bar-tele .go b { color: var(--cg-go); }
.cg-bar-tele .warn b { color: var(--cg-warn); }
.cg-bar-tele .halt b { color: var(--cg-halt); }
.cg-bar-tele .warn.zero b, .cg-bar-tele .halt.zero b { color: var(--cg-dim); }
.cg-new {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px;
  font-size: 12px; font-weight: 800; font-family: inherit; cursor: pointer; color: #fff;
  background: var(--sd-qc-grad); border: none;
  box-shadow: 0 4px 18px color-mix(in srgb, var(--cg-core) 30%, transparent);
}
.cg-new.ghost { background: transparent; color: var(--cg-core); border: 1px dashed var(--cg-brd); box-shadow: none; }

/* ═══ the board ═══ */
.cg-board {
  position: relative; border-radius: 16px; overflow: hidden;
  background: var(--sd-surface); border: 1px solid var(--cg-line);
}
.cg-floor {
  position: absolute; inset: 0; pointer-events: none; opacity: 0.55;
  background:
    radial-gradient(60% 45% at 50% 0%, color-mix(in srgb, var(--cg-core) 7%, transparent), transparent 70%),
    repeating-linear-gradient(0deg, transparent 0 35px, color-mix(in srgb, var(--cg-core) 4%, transparent) 35px 36px),
    repeating-linear-gradient(90deg, transparent 0 35px, color-mix(in srgb, var(--cg-core) 4%, transparent) 35px 36px);
}

.cg-scroll { position: relative; overflow: auto; max-height: 540px; scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--cg-core) 30%, transparent) transparent; }
.cg-grid { position: relative; display: grid; align-items: stretch; min-width: min-content; }

/* the scan beam — sweeps the full board width every 9s */
.cg-beam {
  position: absolute; top: 0; bottom: 0; width: 120px; z-index: 2; pointer-events: none;
  background: linear-gradient(90deg, transparent,
    color-mix(in srgb, var(--cg-core) 6%, transparent) 35%,
    color-mix(in srgb, var(--cg-core) 14%, transparent) 50%,
    color-mix(in srgb, var(--cg-core) 6%, transparent) 65%, transparent);
  animation: cg-sweep 9s linear infinite;
}
.cg-beam::after { content: ''; position: absolute; top: 0; bottom: 0; left: 50%; width: 1px;
  background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--cg-core) 55%, transparent), transparent); }
@keyframes cg-sweep { from { left: -140px; } to { left: 100%; } }

/* corner */
.cg-corner {
  position: sticky; top: 0; left: 0; z-index: 5;
  display: flex; flex-direction: column; justify-content: flex-end; gap: 4px;
  padding: 12px 14px 10px; background: var(--cg-face);
  border-bottom: 1px solid var(--cg-line); border-right: 1px solid var(--cg-line);
  font-size: 8.5px; letter-spacing: 0.14em; color: var(--cg-dim);
}
.cg-corner .ax { display: inline-flex; align-items: center; gap: 5px; }
.cg-corner svg { color: var(--cg-core); opacity: 0.7; }

/* ── skill totems ── */
.cg-colh {
  position: sticky; top: 0; z-index: 4;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 12px 8px 10px; min-width: 0; cursor: pointer; font-family: inherit; text-align: center;
  background: var(--cg-face); border: none; border-bottom: 1px solid var(--cg-line);
  border-right: 1px dashed var(--cg-hair); color: var(--cg-ink);
  animation: cg-drop 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(0.08s + var(--c) * 0.05s);
  transition: background 0.25s;
}
@keyframes cg-drop { from { opacity: 0; transform: translateY(-14px); } to { opacity: 1; transform: none; } }
.cg-colh.hl, .cg-colh:hover { background: var(--cg-face-hi); }
.cg-colh.off { opacity: 0.62; }
.cg-colh-ring { position: relative; width: 34px; height: 34px; display: grid; place-items: center; }
.cg-colh-ring svg { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
.cg-colh-ring .bg { fill: none; stroke: color-mix(in srgb, var(--cg-ink) 13%, transparent); stroke-width: 2.5; }
.cg-colh-ring .fg { fill: none; stroke: var(--sc); stroke-width: 2.5; stroke-linecap: round;
  stroke-dasharray: 78.5; transition: stroke-dashoffset 0.9s cubic-bezier(0.16, 1, 0.3, 1);
  filter: drop-shadow(0 0 4px color-mix(in srgb, var(--sc) 60%, transparent)); }
.cg-colh-ring b { font-size: 11px; color: var(--cg-ink); }
.cg-colh.gap .cg-colh-ring::after {
  content: ''; position: absolute; inset: -4px; border-radius: 50%;
  border: 1px solid var(--cg-halt); animation: cg-alarm 1.6s ease-in-out infinite;
}
@keyframes cg-alarm { 0%, 100% { opacity: 0.15; transform: scale(0.94); } 50% { opacity: 0.85; transform: scale(1.06); } }
.cg-colh-name { font-size: 10.5px; font-weight: 700; line-height: 1.2; max-width: 100%;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.cg-colh-code { font-size: 8px; letter-spacing: 0.12em; color: var(--sc); padding: 1px 6px;
  border-radius: 5px; border: 1px solid color-mix(in srgb, var(--sc) 40%, transparent); }
.cg-colh-demand { display: inline-flex; align-items: center; gap: 3px; font-size: 8px;
  letter-spacing: 0.06em; color: var(--cg-dim); }
.cg-colh-demand.dim { opacity: 0.55; font-style: italic; }
.cg-tag { font-size: 7.5px; font-weight: 800; letter-spacing: 0.12em; padding: 2px 6px; border-radius: 5px; }
.cg-tag.off { color: var(--cg-warn); border: 1px dashed color-mix(in srgb, var(--cg-warn) 50%, transparent); }
.cg-tag.gap { color: var(--cg-halt); border: 1px solid color-mix(in srgb, var(--cg-halt) 50%, transparent);
  animation: cg-blink 1.6s ease-in-out infinite; }
@keyframes cg-blink { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
.cg-colh-pen { position: absolute; top: 7px; right: 7px; color: var(--cg-dim); opacity: 0;
  transition: opacity 0.2s; }
.cg-colh:hover .cg-colh-pen { opacity: 0.85; }

/* ── crew row heads ── */
.cg-rowh {
  position: sticky; left: 0; z-index: 3;
  display: flex; align-items: center; gap: 10px; padding: 8px 14px 8px 12px; min-width: 0;
  background: var(--cg-face); border-right: 1px solid var(--cg-line);
  border-bottom: 1px solid var(--cg-hair); color: var(--cg-ink);
  animation: cg-slide 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(0.12s + var(--r) * 0.04s);
  transition: background 0.25s;
}
@keyframes cg-slide { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: none; } }
.cg-rowh.hl { background: var(--cg-face-hi); }
.cg-rowh.zero { opacity: 0.6; }
.cg-ava {
  width: 28px; height: 28px; border-radius: 9px; display: grid; place-items: center; flex-shrink: 0;
  font-size: 9.5px; font-weight: 800; color: var(--sd-qc-hi);
  background: var(--cg-soft); border: 1px solid var(--cg-brd);
}
.cg-rowh.hl .cg-ava { box-shadow: 0 0 12px color-mix(in srgb, var(--cg-core) 30%, transparent); }
.cg-rowh-b { display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1; }
.cg-rowh-b b { font-size: 11.5px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cg-meter { display: block; height: 2px; border-radius: 2px;
  background: color-mix(in srgb, var(--cg-ink) 10%, transparent); overflow: hidden; }
.cg-meter i { display: block; height: 100%; border-radius: inherit;
  background: linear-gradient(90deg, var(--cg-core), var(--cg-hi));
  transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
.cg-rowh-n { font-size: 10px; color: var(--cg-dim); }

/* ── the diode cells ── */
.cg-cell {
  position: relative; z-index: 1; display: grid; place-items: center; min-height: 44px;
  background: transparent; border: none; cursor: pointer; padding: 0;
  border-bottom: 1px solid var(--cg-hair);
  border-right: 1px dashed var(--cg-hair);
  animation: cg-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(0.15s + var(--w) * 0.026s);
  transition: background 0.2s;
}
@keyframes cg-in { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: none; } }
.cg-cell.hlr, .cg-cell.hlc { background: color-mix(in srgb, var(--cg-core) 5%, transparent); }
.cg-cell.hlr.hlc { background: color-mix(in srgb, var(--cg-core) 11%, transparent); }
.cg-dot {
  position: relative; width: 19px; height: 19px; border-radius: 50%;
  display: grid; place-items: center;
  border: 1.5px solid color-mix(in srgb, var(--cg-ink) 24%, transparent);
  background: color-mix(in srgb, var(--cg-ink) 4%, transparent);
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s, background 0.25s, box-shadow 0.25s;
}
.cg-dot .tick { color: #16100a; opacity: 0; transform: scale(0.4); transition: opacity 0.2s, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
.cg-cell:hover .cg-dot { transform: scale(1.25); border-color: var(--sc); }
.cg-cell.on .cg-dot {
  background: var(--sc); border-color: var(--sc);
  box-shadow: 0 0 10px color-mix(in srgb, var(--sc) 60%, transparent);
  animation: cg-flare 9s linear infinite; animation-delay: var(--fd);
}
.cg-cell.on .cg-dot .tick { opacity: 1; transform: scale(1); }
@keyframes cg-flare {
  0%, 6%, 100% { box-shadow: 0 0 10px color-mix(in srgb, var(--sc) 60%, transparent); }
  3% { box-shadow: 0 0 20px color-mix(in srgb, var(--sc) 95%, transparent), 0 0 34px color-mix(in srgb, var(--sc) 45%, transparent); }
}
.cg-cell.pop .cg-dot { animation: cg-pop 0.55s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes cg-pop { 0% { transform: scale(0.55); } 55% { transform: scale(1.45); } 100% { transform: scale(1); } }
.cg-cell.pop::after {
  content: ''; position: absolute; width: 19px; height: 19px; border-radius: 50%;
  border: 1.5px solid var(--sc); animation: cg-burst 0.6s ease-out both; pointer-events: none;
}
@keyframes cg-burst { from { opacity: 0.9; transform: scale(1); } to { opacity: 0; transform: scale(2.6); } }
.cg-cell.pending { cursor: wait; }
.cg-cell.pending .cg-dot::before {
  content: ''; position: absolute; inset: -5px; border-radius: 50%;
  border: 1.5px solid transparent; border-top-color: var(--sc);
  animation: cg-spin 0.7s linear infinite;
}
@keyframes cg-spin { to { transform: rotate(360deg); } }

.cg-nocrew { padding: 26px 20px; text-align: center; font-size: 10px; letter-spacing: 0.12em;
  color: var(--cg-dim); }

/* board legend */
.cg-legend { position: relative; display: flex; align-items: center; gap: 16px; padding: 8px 16px;
  border-top: 1px solid var(--cg-line); font-size: 8.5px; letter-spacing: 0.12em; color: var(--cg-dim); }
.cg-legend .dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 5px;
  vertical-align: -1px; border: 1.5px solid color-mix(in srgb, var(--cg-ink) 30%, transparent); }
.cg-legend .dot.on { background: var(--cg-core); border-color: var(--cg-core);
  box-shadow: 0 0 6px color-mix(in srgb, var(--cg-core) 55%, transparent); }
.cg-legend .dim { opacity: 0.7; }

/* ── empty vault ── */
.cg-empty { position: relative; display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 58px 24px 62px; text-align: center; color: var(--cg-dim); }
.cg-empty p { margin: 0; font-size: 12px; font-weight: 800; letter-spacing: 0.16em; color: var(--cg-core); }
.cg-empty > span { max-width: 420px; font-size: 12px; line-height: 1.55; }
.cg-empty-socket { position: relative; width: 74px; height: 74px; margin-bottom: 6px; }
.cg-empty-socket i { position: absolute; inset: 0; border-radius: 50%; border: 1.5px dashed var(--cg-brd); }
.cg-empty-socket .s1 { animation: cg-breathe 3.2s ease-in-out infinite; }
.cg-empty-socket .s2 { inset: 12px; border-style: solid; border-color: color-mix(in srgb, var(--cg-core) 22%, transparent);
  animation: cg-breathe 3.2s ease-in-out infinite 0.4s; }
.cg-empty-socket .s3 { inset: 26px; background: var(--cg-soft); border: none;
  box-shadow: 0 0 22px color-mix(in srgb, var(--cg-core) 35%, transparent);
  animation: cg-breathe 3.2s ease-in-out infinite 0.8s; }
@keyframes cg-breathe { 0%, 100% { transform: scale(1); opacity: 0.7; } 50% { transform: scale(1.07); opacity: 1; } }

/* ═══ coverage intelligence ═══ */
.cg-intel { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 10px; }
.cg-alert {
  position: relative; display: flex; flex-direction: column; gap: 7px;
  padding: 12px 14px 12px 20px; border-radius: 13px; overflow: hidden;
  background: var(--sd-surface-elevated);
  border: 1px solid var(--cg-line); color: var(--cg-ink);
  transition: border-color 0.25s, box-shadow 0.25s, transform 0.25s;
}
.cg-alert:hover { border-color: var(--cg-brd); box-shadow: var(--sd-qc-glow); transform: translateY(-2px); }
.cg-alert header { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 800;
  letter-spacing: 0.13em; }
.cg-alert.halt header { color: var(--cg-halt); }
.cg-alert.warn header { color: var(--cg-warn); }
.cg-alert.go header { color: var(--cg-go); }
.cg-alert.dim header { color: var(--cg-dim); }
.cg-alert p { margin: 0; font-size: 11.5px; line-height: 1.55; color: var(--sd-text-secondary); }
.cg-lamp { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; }
.cg-lamp.halt { background: var(--cg-halt); box-shadow: 0 0 12px var(--cg-halt);
  animation: cg-blink 1.6s ease-in-out infinite; }
.cg-lamp.warn { background: var(--cg-warn); box-shadow: 0 0 10px color-mix(in srgb, var(--cg-warn) 60%, transparent); }
.cg-lamp.go { background: var(--cg-go); box-shadow: 0 0 10px color-mix(in srgb, var(--cg-go) 60%, transparent); }
.cg-lamp.dim { background: color-mix(in srgb, var(--cg-ink) 24%, transparent); }
.cg-alert-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.cg-chip {
  display: inline-flex; align-items: center; gap: 4px; padding: 3.5px 9px; border-radius: 999px;
  font-size: 9.5px; font-weight: 700; font-family: inherit; cursor: pointer; letter-spacing: 0.03em;
  background: color-mix(in srgb, var(--cg-ink) 4%, transparent);
  border: 1px solid color-mix(in srgb, var(--cg-ink) 16%, transparent); color: var(--cg-ink);
  transition: transform 0.2s, border-color 0.2s, background 0.2s;
}
.cg-chip:hover { transform: translateY(-1px); }
.cg-chip.skill { border-color: color-mix(in srgb, var(--sc) 45%, transparent); }
.cg-chip.skill:hover { background: color-mix(in srgb, var(--sc) 14%, transparent); }
.cg-chip.skill svg { color: var(--sc); }
.cg-chip.lane:hover { border-color: var(--cg-brd); background: var(--cg-soft); }
.cg-chip.lane svg { color: var(--cg-core); }

/* ═══ reduced motion — a still photograph of the board ═══ */
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .cg-beam,
  html:not([data-cinematic="on"]) .cg-cell.on .cg-dot,
  html:not([data-cinematic="on"]) .cg-colh.gap .cg-colh-ring::after,
  html:not([data-cinematic="on"]) .cg-tag.gap,
  html:not([data-cinematic="on"]) .cg-lamp.halt,
  html:not([data-cinematic="on"]) .cg-empty-socket i,
  html:not([data-cinematic="on"]) .cg-cell.pop .cg-dot,
  html:not([data-cinematic="on"]) .cg-cell.pop::after { animation: none; }
  html:not([data-cinematic="on"]) .cg-cell,
  html:not([data-cinematic="on"]) .cg-colh,
  html:not([data-cinematic="on"]) .cg-rowh { animation-duration: 0.01s; animation-delay: 0s; }
  html:not([data-cinematic="on"]) .cg-cell:hover .cg-dot { transform: none; }
}
</style>
