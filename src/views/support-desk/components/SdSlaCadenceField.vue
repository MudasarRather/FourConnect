<template>
  <div class="cf">
    <!-- ambient instrument floor — fine vertical hairlines -->
    <span class="cf-floor" aria-hidden="true" />

    <!-- ═══ instrument bar — slim console strip (the hero above owns the headline) ═══ -->
    <header class="cf-bar">
      <span class="cf-bar-sig sd-mono" title="Every SLA policy drawn on one logarithmic time axis — ack head, resolve tail. Faster clocks sit left.">
        <Timer :size="12" /> CADENCE FIELD
      </span>
      <span class="cf-bar-note sd-mono">ACK → RESOLVE · LOG TIME AXIS · 10m ‥ 30d</span>
      <span class="cf-sp" />
      <span class="cf-bar-tele sd-mono" aria-label="SLA telemetry">
        <em><b><SdCountUp :value="policies.length" /></b> POLICIES</em>
        <em class="lane"><b><SdCountUp :value="lanesCovered" /></b> LANES CARRY ONE</em>
        <em class="org"><b><SdCountUp :value="orgsCovered" /></b> ORG CONTRACTS</em>
        <em class="cells"><b><SdCountUp :value="timedCells" /></b> CLOCKS SET</em>
      </span>
      <Motion as="button" class="cf-new" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.96 }" @click="$emit('new')">
        <Plus :size="13" /> Forge a policy
      </Motion>
    </header>

    <!-- ═══ the chrono field ═══ -->
    <div v-if="view.length" class="cf-stage">
      <!-- time axis -->
      <div class="cf-axis sd-mono" aria-hidden="true">
        <span class="cf-axis-zero">NOW</span>
        <span v-for="t in TICKS" :key="t.m" class="cf-tick" :style="{ left: t.x + '%' }">{{ t.label }}</span>
      </div>

      <div class="cf-fieldwrap">
        <!-- vertical gridlines + sweeping beam live under the traces -->
        <span class="cf-grid" aria-hidden="true" :style="{ backgroundImage: gridLines }" />
        <span class="cf-beam" aria-hidden="true" />

        <div v-for="(p, i) in view" :key="p.id" class="cf-row" :style="{ '--i': i }"
          :class="{ dflt: p.isDefault }" role="button" :title="`Tune ${p.name}`"
          @click="$emit('edit', p.id)" @mouseleave="hud = null">
          <!-- policy plate -->
          <div class="cf-plate">
            <span v-if="p.isDefault" class="cf-crown" title="Desk default — times every ticket nothing else claims"><Crown :size="11" /></span>
            <b class="cf-plate-name">{{ p.name }}</b>
            <span class="cf-plate-meta sd-mono">
              <button v-if="p.lanes" class="cf-plate-chip" :title="`${p.lanes} lane(s) carry this policy — open the lanes panel`"
                @click.stop="$emit('lanes', p.id)"><Inbox :size="9" /> {{ p.lanes }}</button>
              <span v-if="p.orgs" class="cf-plate-chip org" :title="`${p.orgs} org contract(s) pin this policy`"><Building2 :size="9" /> {{ p.orgs }}</span>
              <span v-if="p.isDefault" class="cf-plate-chip crown sd-mono">DEFAULT</span>
            </span>
          </div>

          <!-- trace lanes -->
          <div class="cf-plot">
            <template v-for="(tr, j) in p.traces" :key="tr.pr">
              <span v-if="tr.timed" class="cf-trace" :style="{
                  top: tr.top + 'px', left: tr.left + '%', width: tr.width + '%',
                  '--tc': tr.color, '--d': (i * 0.12 + j * 0.09) + 's',
                }"
                @mouseenter="hud = { policy: p.name, ...tr }">
                <span class="cf-trace-band" aria-hidden="true" />
                <span class="cf-head" :class="{ solo: !tr.hasReso }" aria-hidden="true" />
                <span v-if="tr.hasReso" class="cf-node" :class="{ hollow: !tr.hasResp }" aria-hidden="true" />
              </span>
              <span v-else class="cf-trace void sd-mono" :style="{ top: tr.top + 'px', '--tc': tr.color }"
                @mouseenter="hud = { policy: p.name, ...tr }">UNTIMED</span>
            </template>
          </div>
        </div>

        <!-- inspection HUD -->
        <div class="cf-hud sd-mono" :class="{ live: !!hud }">
          <template v-if="hud">
            <span class="cf-hud-dot" :style="{ background: hud.color, boxShadow: `0 0 8px ${hud.color}` }" aria-hidden="true" />
            <b>{{ hud.policy }}</b> · <em :style="{ color: hud.color }">{{ hud.pr.toUpperCase() }}</em>
            <span v-if="hud.timed">— ACK {{ hud.respLabel }} · RESOLVE {{ hud.resoLabel }}</span>
            <span v-else>— NO CLOCK · this priority runs untimed</span>
          </template>
          <template v-else>
            <span class="cf-hud-idle">SWEEP A TRACE TO INSPECT · CLICK A ROW TO TUNE ITS CLOCKS</span>
          </template>
        </div>
      </div>
    </div>

    <!-- empty field -->
    <div v-else class="cf-empty">
      <span class="cf-empty-core" aria-hidden="true"><span class="e1" /><span class="e2" /><span class="e3" /></span>
      <p class="sd-mono">THE FIELD IS DARK — NO CLOCKS ARE RUNNING</p>
      <span>Without a policy every ticket runs untimed. Forge the first cadence and the desk starts keeping promises.</span>
      <Motion as="button" class="cf-new ghost" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.96 }" @click="$emit('new')">
        <Plus :size="13" /> Forge the first policy
      </Motion>
    </div>

    <!-- ═══ precedence relay — which clock wins a ticket ═══ -->
    <div class="cf-relay">
      <span class="cf-relay-lb sd-mono" title="A ticket carries exactly one clock — the first source present, left to right, wins it.">
        <Gauge :size="11" /> WINNING CLOCK
      </span>
      <div class="cf-relay-chain">
        <template v-for="(n, ni) in RELAY" :key="n.key">
          <span v-if="ni" class="cf-relay-link" :style="{ '--rd': ni * 0.8 + 's' }" aria-hidden="true"><i class="cf-relay-spark" /></span>
          <span class="cf-relay-node" :title="n.hint">
            <component :is="n.icon" :size="11" />
            <b class="sd-mono">{{ n.label }}</b>
          </span>
        </template>
      </div>
      <span class="cf-sp" />
      <span class="cf-freeze" title="Tickets parked on the requester, a vendor or a hold don't burn SLA — the clock resumes when they re-activate.">
        <Snowflake :size="11" class="cf-freeze-ic" />
        <b class="sd-mono">CLOCK FREEZES ON</b>
        <em class="sd-mono">PENDING CUSTOMER</em><em class="sd-mono">PENDING VENDOR</em><em class="sd-mono">ON HOLD</em>
      </span>
    </div>

    <!-- ═══ chronometer deck ═══ -->
    <div v-if="view.length" class="cf-deck">
      <div v-for="(p, i) in view" :key="p.id" class="cfd-shell" :style="{ '--i': i }">
        <article class="cfd" :class="{ dflt: p.isDefault }" role="button" :title="`Tune ${p.name}`"
          @pointermove="glare" @pointerleave="unglare" @click="$emit('edit', p.id)">
          <span class="cfd-glare" aria-hidden="true" />
          <span v-if="p.isDefault" class="cfd-beacon" aria-hidden="true" />

          <header class="cfd-h">
            <span class="cfd-dial" :style="{ '--cov': p.coverage }" :title="`${p.timed} of ${PRIORITY_KEYS.length * 2} clocks set`" aria-hidden="true">
              <Timer :size="11" />
            </span>
            <div class="cfd-id">
              <b>{{ p.name }}</b>
              <span v-if="p.description" class="cfd-desc">{{ p.description }}</span>
            </div>
            <span class="cf-sp" />
            <span v-if="p.isDefault" class="cfd-stamp sd-mono"><Crown :size="9" /> DEFAULT</span>
            <Pencil :size="12" class="cfd-pen" aria-hidden="true" />
          </header>

          <div class="cfd-meters">
            <div v-for="(tr, j) in p.traces" :key="tr.pr" class="cfd-line" :class="{ void: !tr.timed }">
              <span class="cfd-tag sd-mono" :style="{ color: tr.color }">{{ tr.pr.toUpperCase() }}</span>
              <span class="cfd-track" aria-hidden="true">
                <i v-if="tr.hasResp" class="cfd-fill resp" :style="{ width: tr.respBar + '%', '--tc': tr.color, '--j': j, '--i': i }" />
                <i v-if="tr.hasReso" class="cfd-fill reso" :style="{ left: (tr.hasResp ? tr.respBar : 0) + '%', width: tr.resoBar + '%', '--tc': tr.color, '--j': j, '--i': i }" />
              </span>
              <span class="cfd-vals sd-mono">
                <template v-if="tr.timed">{{ tr.respLabel }} <ChevronRight :size="9" class="cfd-arrow" /> {{ tr.resoLabel }}</template>
                <template v-else>—</template>
              </span>
            </div>
          </div>

          <footer class="cfd-f sd-mono">
            <em v-if="p.fastestAck"><b>{{ p.fastestAck }}</b> FASTEST ACK</em>
            <em v-if="p.longestReso"><b>{{ p.longestReso }}</b> LONGEST RESOLVE</em>
            <span class="cf-sp" />
            <span v-if="p.isDefault && p.uncovered" class="cfd-warn" :title="`${p.uncovered} priorit${p.uncovered === 1 ? 'y' : 'ies'} would run untimed on the default policy`">
              <TriangleAlert :size="10" /> {{ p.uncovered }} UNCLOCKED
            </span>
            <button v-if="p.lanes" class="cfd-chip" :title="'Open the lanes panel'" @click.stop="$emit('lanes', p.id)">
              <Inbox :size="9" /> {{ p.lanes }} lane{{ p.lanes === 1 ? '' : 's' }}
            </button>
            <span v-if="p.orgs" class="cfd-chip org"><Building2 :size="9" /> {{ p.orgs }} org{{ p.orgs === 1 ? '' : 's' }}</span>
          </footer>
        </article>
      </div>
    </div>
  </div>
</template>

<script setup>
/*
  SdSlaCadenceField — "THE CADENCE FIELD", the SLA-clocks panel rendered as a
  chrono observatory. Signature instrument: every policy drawn on ONE logarithmic
  time axis (10m‥30d) — each priority is a light-trace with an ack head and a
  luminous decay band out to its resolve node, a beam sweeps the field, and a HUD
  line live-inspects whatever the pointer crosses. Below: the precedence relay
  (rule/agent pick → org contract → lane policy → desk default — first present
  wins) with the stop-the-clock freeze states, then the chronometer deck
  (lift+glow policy cards, coverage dial, per-priority dual meters, lanes/org
  linkage, default-gap warnings).
  Stage is THEME-AWARE like the Intercept Gauntlet — only the hero above keeps
  the dark void (established user feedback: a second dark stage reads repetitive).
  Cards lift+glow instead of rotateX/Y tilt (grid-constrained tilt shears the 1px
  border — same lesson). Presentational only: raw policies/queues/orgs come in,
  all writes stay in the section. Distinct on purpose from the Decision Graph's
  DAG canvas and the Gauntlet's corridor — this is the desk's only time-axis stage.
*/
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import {
  Timer, Plus, Crown, Inbox, Building2, Gauge, Snowflake, Pencil, ChevronRight,
  Zap, TriangleAlert,
} from 'lucide-vue-next'
import SdCountUp from './SdCountUp.vue'

const props = defineProps({
  policies: { type: Array, default: () => [] },       // raw SdSlaPackage rows
  queues: { type: Array, default: () => [] },         // raw lanes (sla_package_id linkage)
  organizations: { type: Array, default: () => [] },  // raw orgs (contract linkage)
})
defineEmits(['new', 'edit', 'lanes'])

const PRIORITY_KEYS = ['critical', 'urgent', 'high', 'medium', 'low']
/* theme-aware priority accents — the stage sits on the elevated surface, so the
   page palette's own tokens read correctly in both themes */
const PRI_COLOR = (pr) => `var(--sd-pri-${pr})`

/* ── logarithmic time axis: 10 minutes ‥ 30 days ── */
const T_MIN = 10
const T_MAX = 43200
const X = (m) => {
  const v = Math.max(T_MIN, Math.min(T_MAX, Number(m) || T_MIN))
  return ((Math.log(v) - Math.log(T_MIN)) / (Math.log(T_MAX) - Math.log(T_MIN))) * 100
}
const TICKS = [
  { m: 15, label: '15m' }, { m: 60, label: '1h' }, { m: 240, label: '4h' },
  { m: 1440, label: '1d' }, { m: 4320, label: '3d' }, { m: 10080, label: '7d' },
  { m: 43200, label: '30d' },
].map(t => ({ ...t, x: X(t.m) }))
const gridLines = computed(() =>
  TICKS.map(t => `linear-gradient(90deg, transparent calc(${t.x}% - 0.5px), color-mix(in srgb, var(--sd-qc-core) 22%, transparent) calc(${t.x}% - 0.5px), color-mix(in srgb, var(--sd-qc-core) 22%, transparent) calc(${t.x}% + 0.5px), transparent calc(${t.x}% + 0.5px))`).join(', '))

const fmt = (m) => (m == null || m === '' || !Number(m) ? '' : m < 60 ? `${m}m` : m < 1440 ? `${Math.round((m / 60) * 10) / 10}h` : `${Math.round((m / 1440) * 10) / 10}d`)

const lanesOn = (pid) => props.queues.filter(q => String(q.sla_package_id || '') === String(pid)).length
const orgsOn = (pid) => props.organizations.filter(o => String(o.sla_package_id || '') === String(pid)).length
const lanesCovered = computed(() => props.queues.filter(q => q.sla_package_id).length)
const orgsCovered = computed(() => props.organizations.filter(o => o.sla_package_id).length)
const timedCells = computed(() => props.policies.reduce((s, p) => {
  const m = p.matrix || {}
  return s + PRIORITY_KEYS.reduce((c, k) => c + (m[k]?.response_mins ? 1 : 0) + (m[k]?.resolution_mins ? 1 : 0), 0)
}, 0))

/* display model — default policy leads the field, the rest keep backend (name) order */
const LANE_STEP = 15
const view = computed(() => {
  const rows = [...props.policies].sort((a, b) => (b.is_default === true) - (a.is_default === true))
  return rows.map(p => {
    const m = p.matrix || {}
    let timed = 0
    let uncovered = 0
    let fastest = null
    let longest = null
    const traces = PRIORITY_KEYS.map((pr, j) => {
      const row = m[pr] || {}
      const resp = Number(row.response_mins) || 0
      const reso = Number(row.resolution_mins) || 0
      if (resp) { timed++; fastest = fastest == null ? resp : Math.min(fastest, resp) }
      if (reso) { timed++; longest = longest == null ? reso : Math.max(longest, reso) }
      if (!resp && !reso) uncovered++
      const left = X(resp || reso)
      const right = X(reso || resp)
      return {
        pr, color: PRI_COLOR(pr), top: 12 + j * LANE_STEP,
        timed: !!(resp || reso), hasResp: !!resp, hasReso: !!reso,
        left, width: Math.max(reso && resp ? right - left : 0, 0.4),
        respLabel: fmt(resp) || '—', resoLabel: fmt(reso) || '—',
        /* deck bars: ack segment then the remaining run to resolve, log scale */
        respBar: resp ? Math.max(X(resp), 2.5) : 0,
        resoBar: reso ? Math.max(X(reso) - (resp ? Math.max(X(resp), 2.5) : 0), 2.5) : 0,
      }
    })
    return {
      id: p.id, name: p.name, description: p.description || '', isDefault: !!p.is_default,
      lanes: lanesOn(p.id), orgs: orgsOn(p.id), traces, timed, uncovered,
      coverage: Math.round((timed / (PRIORITY_KEYS.length * 2)) * 100),
      fastestAck: fmt(fastest), longestReso: fmt(longest),
    }
  })
})

/* inspection HUD — the readout strip under the field */
const hud = ref(null)

/* precedence relay — mirrors apply_queue_sla: explicit/rule > org > queue > default */
const RELAY = [
  { key: 'rule', icon: Zap, label: 'RULE / AGENT PICK', hint: 'A routing rule’s “apply SLA package” or an agent’s explicit pick — always wins' },
  { key: 'org', icon: Building2, label: 'ORG CONTRACT', hint: 'The requester’s organization carries a contracted policy' },
  { key: 'lane', icon: Inbox, label: 'LANE POLICY', hint: 'The lane the ticket lands in re-classes desk-default tickets' },
  { key: 'dflt', icon: Crown, label: 'DESK DEFAULT', hint: 'The crowned policy — times everything nothing else claims' },
]

/* pointer glare (same contract as the section's lane cards) */
const glare = (e) => {
  const el = e.currentTarget, r = el.getBoundingClientRect()
  el.style.setProperty('--mx', ((e.clientX - r.left) / r.width).toFixed(3))
  el.style.setProperty('--my', ((e.clientY - r.top) / r.height).toFixed(3))
  el.style.setProperty('--spot', '1')
}
const unglare = (e) => e.currentTarget.style.setProperty('--spot', '0')
</script>

<style scoped>
/* ═══ shell — theme-aware instrument bay (the hero above owns the dark void) ═══ */
.cf {
  position: relative; overflow: hidden; isolation: isolate;
  border: 1px solid var(--sd-border); border-radius: 18px;
  background: linear-gradient(180deg, var(--sd-qc-soft), transparent 130px), var(--sd-surface-elevated);
  padding: 0 18px 18px;
}
.cf-sp { flex: 1; }
/* instrument floor — fine vertical hairlines, the field's "graph paper" */
.cf-floor {
  position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0.55;
  background: repeating-linear-gradient(90deg, color-mix(in srgb, var(--sd-qc-core) 6%, transparent) 0 1px, transparent 1px 34px);
  mask-image: linear-gradient(180deg, transparent 0%, #000 30%, #000 72%, transparent 100%);
  -webkit-mask-image: linear-gradient(180deg, transparent 0%, #000 30%, #000 72%, transparent 100%);
}

/* ═══ instrument bar ═══ */
.cf-bar {
  position: relative; z-index: 2; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  margin: 0 -18px 16px; padding: 11px 18px;
  border-bottom: 1px solid var(--sd-border);
  background: linear-gradient(90deg, var(--sd-qc-soft), transparent 60%);
}
.cf-bar-sig {
  display: inline-flex; align-items: center; gap: 7px; cursor: help;
  font-size: 10px; font-weight: 900; letter-spacing: 0.22em; color: var(--sd-qc-core);
}
.cf-bar-note { font-size: 8.5px; letter-spacing: 0.16em; color: var(--sd-text-muted); }
.cf-bar-tele { display: inline-flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.cf-bar-tele em { font-style: normal; font-size: 8.5px; letter-spacing: 0.14em; color: var(--sd-text-muted); }
.cf-bar-tele em b { font-size: 13px; letter-spacing: 0; color: var(--sd-qc-hi); margin-right: 3px; }
.cf-bar-tele em.lane b { color: var(--sd-qc-core); }
.cf-bar-tele em.org b { color: var(--sd-qc-go); }
.cf-bar-tele em.cells b { color: var(--sd-qc-hi); }
.cf-new {
  display: inline-flex; align-items: center; gap: 6px; align-self: center;
  padding: 7px 13px; border-radius: 10px; font-size: 11px; font-weight: 800; cursor: pointer;
  border: 1px solid transparent; color: #241703;
  background: var(--sd-qc-grad);
  box-shadow: var(--sd-qc-glow);
}
.cf-new.ghost { background: transparent; color: var(--sd-qc-core); border-color: var(--sd-qc-brd); box-shadow: none; }

/* ═══ the chrono field — open instrumentation, engraved into the shell (no boxed
   second stage: the hero above owns the dark void, this must not echo it) ═══ */
.cf-stage {
  position: relative; z-index: 1;
  animation: cf-stage-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes cf-stage-in { from { opacity: 0; transform: translateY(10px); } }

/* time axis */
.cf-axis {
  position: relative; height: 26px; margin-left: 208px; margin-right: 14px;
  border-bottom: 1px solid color-mix(in srgb, var(--sd-qc-core) 26%, transparent);
}
.cf-axis-zero {
  position: absolute; left: 0; bottom: 5px; transform: translateX(-2px);
  font-size: 8px; font-weight: 900; letter-spacing: 0.2em; color: var(--sd-qc-core);
}
.cf-tick {
  position: absolute; bottom: 5px; transform: translateX(-50%);
  font-size: 8.5px; letter-spacing: 0.12em; color: var(--sd-text-muted);
  animation: cf-tick-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.cf-tick:nth-child(2) { animation-delay: 0.08s; } .cf-tick:nth-child(3) { animation-delay: 0.14s; }
.cf-tick:nth-child(4) { animation-delay: 0.2s; }  .cf-tick:nth-child(5) { animation-delay: 0.26s; }
.cf-tick:nth-child(6) { animation-delay: 0.32s; } .cf-tick:nth-child(7) { animation-delay: 0.38s; }
.cf-tick:nth-child(8) { animation-delay: 0.44s; }
@keyframes cf-tick-in { from { opacity: 0; transform: translate(-50%, -5px); } to { opacity: 1; transform: translate(-50%, 0); } }

.cf-fieldwrap { position: relative; padding: 4px 14px 0 0; }
.cf-grid {
  position: absolute; top: 0; bottom: 34px; left: 208px; right: 14px;
  pointer-events: none; opacity: 0.8;
}
/* the sweeping beam — a light bar patrolling the field */
.cf-beam {
  position: absolute; top: 0; bottom: 34px; left: 208px; right: 14px; pointer-events: none;
  background: linear-gradient(90deg,
    transparent,
    color-mix(in srgb, var(--sd-qc-core) 5%, transparent) 38%,
    color-mix(in srgb, var(--sd-qc-core) 20%, transparent) 50%,
    color-mix(in srgb, var(--sd-qc-core) 5%, transparent) 62%,
    transparent);
  background-size: 200px 100%; background-repeat: no-repeat;
  animation: cf-sweep 8.5s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
}
@keyframes cf-sweep {
  0% { background-position: -200px 0; }
  60% { background-position: calc(100% + 200px) 0; }
  100% { background-position: calc(100% + 200px) 0; }
}

/* policy rows */
.cf-row {
  position: relative; display: grid; grid-template-columns: 208px minmax(0, 1fr);
  min-height: 96px; cursor: pointer;
  border-bottom: 1px dashed color-mix(in srgb, var(--sd-qc-core) 14%, transparent);
  animation: cf-row-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(var(--i, 0) * 0.09s);
  transition: background 0.25s;
}
.cf-row:last-of-type { border-bottom: 0; }
.cf-row:hover { background: color-mix(in srgb, var(--sd-qc-core) 5%, transparent); }
@keyframes cf-row-in { from { opacity: 0; transform: translateX(-14px); } }

.cf-plate {
  display: flex; flex-direction: column; justify-content: center; gap: 5px;
  padding: 10px 14px; min-width: 0;
  border-right: 1px solid color-mix(in srgb, var(--sd-qc-core) 20%, transparent);
  background: linear-gradient(90deg, var(--sd-qc-soft), transparent);
}
.cf-row.dflt .cf-plate { background: linear-gradient(90deg, color-mix(in srgb, var(--sd-qc-core) 14%, transparent), transparent); }
.cf-crown {
  display: inline-flex; width: fit-content; color: var(--sd-qc-core);
  filter: drop-shadow(0 0 6px color-mix(in srgb, var(--sd-qc-core) 70%, transparent));
  animation: cf-crown-pulse 2.6s ease-in-out infinite;
}
@keyframes cf-crown-pulse { 50% { filter: drop-shadow(0 0 12px var(--sd-qc-core)); } }
.cf-plate-name {
  font-size: 12.5px; font-weight: 800; color: var(--sd-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.cf-plate-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.cf-plate-chip {
  display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 999px;
  font-size: 8.5px; font-weight: 800; letter-spacing: 0.1em; cursor: pointer;
  font-family: inherit;
  color: var(--sd-qc-core); background: var(--sd-qc-soft); border: 1px solid var(--sd-qc-brd);
  transition: background 0.2s, transform 0.2s;
}
button.cf-plate-chip:hover { background: color-mix(in srgb, var(--sd-qc-core) 24%, transparent); transform: translateY(-1px); }
.cf-plate-chip.org { color: var(--sd-qc-go); background: var(--sd-qc-go-soft); border-color: color-mix(in srgb, var(--sd-qc-go) 32%, transparent); cursor: default; }
.cf-plate-chip.crown { color: #241703; background: var(--sd-qc-grad); border-color: transparent; cursor: default; }

/* the traces */
.cf-plot { position: relative; min-height: 96px; }
.cf-trace {
  position: absolute; height: 8px; margin-top: -4px; border-radius: 999px;
  min-width: 8px; cursor: pointer;
  animation: cf-trace-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: var(--d, 0s);
  transform-origin: left center;
}
@keyframes cf-trace-in { from { opacity: 0; transform: scaleX(0); } to { opacity: 1; transform: scaleX(1); } }
.cf-trace-band {
  position: absolute; inset: 1.5px 0; border-radius: 999px;
  background: linear-gradient(90deg, var(--tc), color-mix(in srgb, var(--tc) 42%, transparent) 55%, color-mix(in srgb, var(--tc) 14%, transparent));
  box-shadow: 0 0 10px color-mix(in srgb, var(--tc) 35%, transparent);
}
.cf-trace:hover .cf-trace-band { box-shadow: 0 0 16px color-mix(in srgb, var(--tc) 70%, transparent); }
.cf-head {
  position: absolute; left: -4px; top: 50%; width: 9px; height: 9px; margin-top: -4.5px;
  border-radius: 50%; background: var(--tc);
  box-shadow: 0 0 9px var(--tc);
  animation: cf-head-breathe 3.2s ease-in-out infinite; animation-delay: var(--d, 0s);
}
.cf-head.solo { animation-duration: 2.2s; }
@keyframes cf-head-breathe { 50% { box-shadow: 0 0 16px var(--tc), 0 0 30px color-mix(in srgb, var(--tc) 45%, transparent); } }
.cf-node {
  position: absolute; right: -5px; top: 50%; width: 11px; height: 11px; margin-top: -5.5px;
  border-radius: 50%; border: 2px solid var(--tc); background: var(--sd-surface-elevated);
  box-shadow: 0 0 8px color-mix(in srgb, var(--tc) 55%, transparent);
}
.cf-node.hollow { border-style: dashed; }
.cf-trace.void {
  left: 0; height: auto; margin-top: -5px; min-width: 0; cursor: help;
  font-size: 7.5px; letter-spacing: 0.22em; color: color-mix(in srgb, var(--tc) 45%, transparent);
  animation: none; padding-left: 2px;
}

/* inspection HUD */
.cf-hud {
  position: relative; display: flex; align-items: center; gap: 7px;
  height: 34px; margin-left: 208px; padding: 0 4px;
  border-top: 1px solid color-mix(in srgb, var(--sd-qc-core) 22%, transparent);
  font-size: 9.5px; letter-spacing: 0.1em; color: var(--sd-text-secondary);
}
.cf-hud b { color: var(--sd-qc-hi); font-weight: 900; }
.cf-hud em { font-style: normal; font-weight: 900; }
.cf-hud-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.cf-hud-idle { color: var(--sd-text-dim); font-size: 8.5px; letter-spacing: 0.2em; animation: cf-idle-breathe 3.6s ease-in-out infinite; }
@keyframes cf-idle-breathe { 50% { opacity: 0.55; } }
.cf-hud.live { background: linear-gradient(90deg, var(--sd-qc-soft), transparent 70%); }

/* ═══ empty field ═══ */
.cf-empty {
  position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 44px 20px 40px; text-align: center; border-radius: 14px;
  border: 1px dashed var(--sd-qc-brd);
  background: radial-gradient(90% 120% at 50% 0%, var(--sd-qc-soft), transparent 55%);
}
.cf-empty p { margin: 0; font-size: 10.5px; font-weight: 900; letter-spacing: 0.24em; color: var(--sd-qc-core); }
.cf-empty > span { font-size: 11.5px; color: var(--sd-text-muted); max-width: 420px; line-height: 1.6; }
.cf-empty-core { position: relative; width: 46px; height: 46px; display: grid; place-items: center; margin-bottom: 4px; }
.cf-empty-core span {
  position: absolute; inset: 0; border-radius: 50%;
  border: 1.5px solid color-mix(in srgb, var(--sd-qc-core) 55%, transparent);
  animation: cf-empty-emit 3.4s ease-out infinite;
}
.cf-empty-core .e2 { animation-delay: 1.15s; }
.cf-empty-core .e3 { animation-delay: 2.3s; }
@keyframes cf-empty-emit { from { transform: scale(0.35); opacity: 0.9; } to { transform: scale(1.7); opacity: 0; } }

/* ═══ precedence relay ═══ */
.cf-relay {
  position: relative; z-index: 1; display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
  margin-top: 14px; padding: 11px 14px; border-radius: 12px;
  border: 1px solid var(--sd-border);
  background: linear-gradient(90deg, var(--sd-qc-soft), transparent 55%);
}
.cf-relay-lb {
  display: inline-flex; align-items: center; gap: 6px; cursor: help;
  font-size: 9px; font-weight: 900; letter-spacing: 0.2em; color: var(--sd-qc-core);
}
.cf-relay-chain { display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.cf-relay-node {
  display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px;
  border: 1px solid var(--sd-qc-brd); background: var(--sd-qc-soft); color: var(--sd-qc-hi);
  cursor: help; transition: transform 0.2s, box-shadow 0.2s;
}
.cf-relay-node:hover { transform: translateY(-2px); box-shadow: var(--sd-qc-glow); }
.cf-relay-node b { font-size: 8.5px; font-weight: 900; letter-spacing: 0.14em; }
.cf-relay-link {
  position: relative; width: 30px; height: 2px; border-radius: 2px; overflow: visible;
  background: repeating-linear-gradient(90deg, color-mix(in srgb, var(--sd-qc-core) 65%, transparent) 0 5px, transparent 5px 10px);
  animation: cf-link-flow 1.1s linear infinite;
}
@keyframes cf-link-flow { to { background-position: 10px 0; } }
.cf-relay-spark {
  position: absolute; top: 50%; left: 0; width: 6px; height: 6px; margin-top: -3px; border-radius: 50%;
  background: var(--sd-qc-hi); box-shadow: 0 0 8px var(--sd-qc-core);
  animation: cf-spark-run 2.4s ease-in-out infinite; animation-delay: var(--rd, 0s);
}
@keyframes cf-spark-run { 0%, 12% { left: -3px; opacity: 0; } 22% { opacity: 1; } 45% { left: calc(100% - 3px); opacity: 1; } 55%, 100% { left: calc(100% - 3px); opacity: 0; } }
.cf-freeze { display: inline-flex; align-items: center; gap: 7px; flex-wrap: wrap; cursor: help; }
.cf-freeze-ic { color: var(--sd-qc-spill); animation: cf-freeze-spin 12s linear infinite; }
@keyframes cf-freeze-spin { to { transform: rotate(360deg); } }
.cf-freeze b { font-size: 8px; font-weight: 900; letter-spacing: 0.18em; color: var(--sd-text-muted); }
.cf-freeze em {
  font-style: normal; font-size: 8px; font-weight: 800; letter-spacing: 0.12em;
  padding: 3px 7px; border-radius: 6px; color: var(--sd-qc-spill);
  border: 1px dashed color-mix(in srgb, var(--sd-qc-spill) 45%, transparent);
  background: var(--sd-qc-spill-soft);
}

/* ═══ chronometer deck ═══ */
.cf-deck {
  position: relative; z-index: 1;
  display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 12px;
  margin-top: 14px;
}
.cfd-shell { animation: cf-deal 0.55s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: calc(var(--i, 0) * 0.06s); }
@keyframes cf-deal { from { opacity: 0; transform: translateY(16px) scale(0.98); } }
.cfd {
  position: relative; overflow: hidden; height: 100%; cursor: pointer;
  display: flex; flex-direction: column; gap: 10px;
  border: 1px solid var(--sd-border); border-radius: 14px; padding: 13px 14px;
  background: var(--sd-surface-elevated);
  /* lift + glow, NOT rotateX/Y — grid-constrained tilt shears the 1px border */
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s, box-shadow 0.25s;
}
.cfd:hover { border-color: var(--sd-qc-brd); box-shadow: var(--sd-qc-glow); transform: translateY(-3px); }
.cfd.dflt { border-color: var(--sd-qc-brd); }
.cfd-glare {
  position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(320px circle at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), color-mix(in srgb, var(--sd-qc-core) 10%, transparent), transparent 65%);
}
.cfd-beacon {
  position: absolute; top: -34px; right: -34px; width: 88px; height: 88px; border-radius: 50%;
  background: conic-gradient(from 0deg, transparent, color-mix(in srgb, var(--sd-qc-core) 30%, transparent), transparent 32%);
  animation: cf-beacon-spin 5.5s linear infinite; pointer-events: none;
}
@keyframes cf-beacon-spin { to { transform: rotate(360deg); } }

.cfd-h { display: flex; align-items: flex-start; gap: 10px; min-width: 0; }
.cfd-dial {
  position: relative; width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
  display: grid; place-items: center; color: var(--sd-qc-core);
  background:
    radial-gradient(var(--sd-surface-elevated) 57%, transparent 58%),
    conic-gradient(var(--sd-qc-core) calc(var(--cov, 0) * 1%), color-mix(in srgb, var(--sd-qc-core) 14%, transparent) 0);
}
.cfd-id { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.cfd-id b { font-size: 13.5px; font-weight: 800; color: var(--sd-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cfd-desc {
  font-size: 10.5px; color: var(--sd-text-muted); line-height: 1.45;
  display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;
}
.cfd-stamp {
  display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0;
  font-size: 8px; font-weight: 900; letter-spacing: 0.16em; padding: 3px 8px; border-radius: 999px;
  color: #241703; background: var(--sd-qc-grad);
}
.cfd-pen { color: var(--sd-text-dim); opacity: 0; transition: opacity 0.25s; flex-shrink: 0; margin-top: 2px; }
.cfd:hover .cfd-pen { opacity: 1; }

.cfd-meters { display: flex; flex-direction: column; gap: 7px; }
.cfd-line { display: grid; grid-template-columns: 62px minmax(0, 1fr) auto; align-items: center; gap: 9px; }
.cfd-tag { font-size: 8.5px; font-weight: 900; letter-spacing: 0.1em; }
.cfd-line.void .cfd-tag { opacity: 0.38; }
.cfd-track {
  position: relative; height: 7px; border-radius: 999px; overflow: hidden;
  background: color-mix(in srgb, var(--sd-text-dim) 14%, transparent);
}
.cfd-line.void .cfd-track { background: transparent; border: 1px dashed color-mix(in srgb, var(--sd-text-dim) 35%, transparent); }
.cfd-fill {
  position: absolute; top: 0; bottom: 0; border-radius: 999px;
  transform-origin: left center;
  animation: cf-fill-grow 0.9s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(var(--i, 0) * 0.06s + var(--j, 0) * 0.07s + 0.15s);
}
.cfd-fill.resp { left: 0; background: var(--tc); box-shadow: 0 0 7px color-mix(in srgb, var(--tc) 55%, transparent); z-index: 1; }
.cfd-fill.reso { background: linear-gradient(90deg, color-mix(in srgb, var(--tc) 46%, transparent), color-mix(in srgb, var(--tc) 14%, transparent)); }
@keyframes cf-fill-grow { from { transform: scaleX(0); } }
.cfd-vals { display: inline-flex; align-items: center; gap: 3px; font-size: 9.5px; color: var(--sd-text-secondary); white-space: nowrap; }
.cfd-line.void .cfd-vals { color: var(--sd-text-dim); }
.cfd-arrow { color: var(--sd-text-dim); }

.cfd-f { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: auto; padding-top: 4px; border-top: 1px dashed var(--sd-border); }
.cfd-f em { font-style: normal; font-size: 7.5px; letter-spacing: 0.14em; color: var(--sd-text-muted); }
.cfd-f em b { font-size: 11px; letter-spacing: 0; color: var(--sd-qc-hi); margin-right: 3px; }
.cfd-warn {
  display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 6px;
  font-size: 7.5px; font-weight: 900; letter-spacing: 0.12em; cursor: help;
  color: var(--sd-qc-warn); background: var(--sd-qc-warn-soft);
  border: 1px solid color-mix(in srgb, var(--sd-qc-warn) 40%, transparent);
}
.cfd-chip {
  display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px;
  font-size: 8px; font-weight: 800; letter-spacing: 0.08em; cursor: pointer; font-family: inherit;
  color: var(--sd-qc-core); background: var(--sd-qc-soft); border: 1px solid var(--sd-qc-brd);
  transition: transform 0.2s, background 0.2s;
}
button.cfd-chip:hover { transform: translateY(-1px); background: color-mix(in srgb, var(--sd-qc-core) 22%, transparent); }
.cfd-chip.org { color: var(--sd-qc-go); background: var(--sd-qc-go-soft); border-color: color-mix(in srgb, var(--sd-qc-go) 35%, transparent); cursor: default; }

/* ═══ responsive ═══ */
@media (max-width: 860px) {
  .cf-axis, .cf-hud { margin-left: 130px; }
  .cf-grid, .cf-beam { left: 130px; }
  .cf-row { grid-template-columns: 130px minmax(0, 1fr); }
  .cf-plate { padding: 8px 9px; }
  .cf-relay { gap: 10px; }
}
@media (max-width: 560px) {
  .cf-axis, .cf-hud { margin-left: 0; }
  .cf-grid, .cf-beam { left: 0; }
  .cf-row { grid-template-columns: 1fr; min-height: 0; }
  .cf-plate { border-right: 0; border-bottom: 1px solid color-mix(in srgb, var(--sd-qc-core) 20%, transparent); flex-direction: row; align-items: center; }
  .cf-plot { min-height: 96px; }
}

/* ═══ reduced motion — ambient loops off unless cinematic mode forces them on ═══ */
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .cf-stage,
  html:not([data-cinematic="on"]) .cf-tick,
  html:not([data-cinematic="on"]) .cf-row,
  html:not([data-cinematic="on"]) .cf-trace,
  html:not([data-cinematic="on"]) .cf-head,
  html:not([data-cinematic="on"]) .cf-crown,
  html:not([data-cinematic="on"]) .cf-hud-idle,
  html:not([data-cinematic="on"]) .cf-empty-core span,
  html:not([data-cinematic="on"]) .cf-relay-link,
  html:not([data-cinematic="on"]) .cf-freeze-ic,
  html:not([data-cinematic="on"]) .cfd-shell,
  html:not([data-cinematic="on"]) .cfd-beacon,
  html:not([data-cinematic="on"]) .cfd-fill { animation: none; }
  html:not([data-cinematic="on"]) .cf-beam,
  html:not([data-cinematic="on"]) .cf-relay-spark { animation: none; opacity: 0; }
  html:not([data-cinematic="on"]) .cfd:hover { transform: none; }
}

/* ═══ light theme — deepen what reads too pale on cream ═══ */
[data-theme="light"] .cf { background: linear-gradient(180deg, var(--sd-qc-soft), transparent 130px), var(--sd-surface-elevated); }
[data-theme="light"] .cf-stage { border-color: var(--sd-border-strong); }
[data-theme="light"] .cf-trace-band { box-shadow: 0 0 8px color-mix(in srgb, var(--tc) 28%, transparent); }
[data-theme="light"] .cfd { box-shadow: 0 2px 10px rgba(60, 42, 8, 0.05); }
[data-theme="light"] .cfd-glare {
  background: radial-gradient(320px circle at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), rgba(168, 121, 27, 0.08), transparent 65%);
}
</style>
