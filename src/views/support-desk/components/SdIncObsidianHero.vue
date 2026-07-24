<template>
  <!-- SdIncObsidianHero — "B6 OBSIDIAN GLASS", ported 1:1 from the winning artifact's
       HERO REGION (masthead → spatial glass stage → verb sheet). Three depth-separated
       strata of frosted glass you look THROUGH: the MI docket floats closest, the live
       fleet holds the middle, the record sits cool behind everything. Pointer = parallax,
       the strata tab bar / clicking glass RACKS FOCUS (depth-of-field), a fleet chip
       slides the VERB SHEET in from the stage's right edge. The stage is obsidian in
       BOTH themes (house display-panel rule); the chrome above it is theme-native. -->
  <section class="oh" :class="{ 'is-ready': ready }" aria-label="Command Funnel — Obsidian Glass hero">
    <!-- ambient obsidian field — volumetric gradient drift -->
    <div class="oh-ambient" aria-hidden="true"><i class="blob b1" /><i class="blob b2" /><i class="blob b3" /></div>

    <!-- ═══ a · masthead ═══ -->
    <header class="oh-mast rise">
      <span class="oh-crumb sd-mono"><b>COMMAND FUNNEL</b> · CRITICAL INCIDENTS · SEV1∪SEV2 ·
        /ADMIN/SUPPORT-DESK/INCIDENTS/CRITICAL</span>
      <span class="oh-clock sd-mono"><b>{{ clock }}</b><template v-if="tzShort"> {{ tzShort }}</template>
        · GOVERNANCE VIEW</span>
    </header>

    <!-- ═══ b · display headline + strata paragraph + CTAs ═══ -->
    <div class="oh-hero rise d1">
      <h1 class="oh-h1">The desk you look <em>through</em>, not at.</h1>
      <p class="oh-sub">Three strata of glass, depth-separated: the <b>docket</b> floats closest —
        {{ docketN ? `${docketN} candidate${docketN > 1 ? 's await' : ' awaits'} your word` : 'clear, for now' }}.
        The <b>live fleet</b> holds the middle. The <b>record</b> sits cool behind everything.
        Rack focus to govern each plane.</p>
      <div class="oh-ctas">
        <button class="oh-key hot" @click="ctaDocket">
          Rule on the docket<template v-if="docketN"> · {{ docketN }}</template></button>
        <button class="oh-key" @click="$emit('go', 'pirs')">Review PIRs · {{ pirReview }}</button>
        <Transition name="oh-arr">
          <span v-if="arriveN" class="oh-arrive sd-mono"><Radio :size="10" /> +{{ arriveN }} ON THE LENS</span>
        </Transition>
      </div>
    </div>

    <!-- ═══ c · strata tab bar + SEV legend + hint ═══ -->
    <div class="stack-bar rise d2">
      <div class="stabs" role="tablist" aria-label="Strata">
        <button class="stab sd-mono" :class="{ on: focus === 'front' }" role="tab"
          :aria-selected="focus === 'front'" @click="rack('front')">Docket · {{ docketN }}</button>
        <button class="stab sd-mono" :class="{ on: focus === 'mid' }" role="tab"
          :aria-selected="focus === 'mid'" @click="rack('mid')">Fleet · {{ fleetN }}</button>
        <button class="stab sd-mono" :class="{ on: focus === 'back' }" role="tab"
          :aria-selected="focus === 'back'" @click="rack('back')">
          Record · {{ landed.length }} + {{ pirTotal }} PIR</button>
      </div>
      <div class="stack-legend">
        <button class="leg sd-mono" :class="{ on: activeLens === 'sev1' }"
          @click="$emit('lens', 'sev1')">SEV1 <b>×{{ sev1 }}</b></button>
        <button class="leg sd-mono" :class="{ on: activeLens === 'sev2' }"
          @click="$emit('lens', 'sev2')">SEV2 <b>×{{ sev2 }}</b></button>
        <button class="leg red sd-mono" :class="{ on: activeLens === 'breached', zero: !breached }"
          @click="$emit('lens', 'breached')">BREACHED <b>{{ breached }}</b></button>
        <span class="stack-hint sd-mono">POINTER = PARALLAX · CLICK GLASS TO RACK FOCUS · CHIP OPENS VERB SHEET</span>
      </div>
    </div>

    <!-- ═══ d · THE SPATIAL GLASS STAGE (obsidian BOTH themes) ═══ -->
    <div ref="stackRef" class="stack rise d3" :class="`f-${focus}`"
      @pointermove="onMove" @pointerleave="onLeave" @click.capture="onStackClick">

      <!-- ── BACK STRATUM · THE RECORD ── -->
      <div ref="backLayer" class="layer layer-back" data-f="back">
        <div class="lscale">
          <div class="record">
            <span class="stratum-tag sd-mono">BACK STRATUM — THE RECORD · RECENTLY LANDED + PIR QUEUE</span>
            <div class="record-grid">
              <button v-for="it in landedCards" :key="String(it.id)" class="land g spec"
                @click="$emit('open', it.id)">
                <span class="l-id sd-mono">{{ it.ticket_number }} · SEV{{ it.sev }} · {{ landedAge(it) }}</span>
                <p class="l-sub">{{ it.subject }}</p>
                <p class="l-mttr sd-mono">MTTR <b>{{ mttrOf(it) }}</b></p>
                <span class="pill sd-mono" :class="pirTagCls(it)">{{ pirTag(it) }}</span>
              </button>
              <div v-if="!landedCards.length" class="land g calm sd-mono">
                NOTHING LANDED IN THE WINDOW — THE SHELF FILLS AS FAULTS RESOLVE.</div>
            </div>
            <div class="pirq">
              <div v-for="p in pirCards" :key="String(p.id)" class="pir-card g spec">
                <div class="pir-body">
                  <span class="p-id sd-mono">{{ p.report_number }} · {{ p.ticket_number }} ·
                    {{ p.status === 'approved' ? 'APPROVED' : `IN REVIEW ${pirAge(p)}` }}</span>
                  <p class="p-sub">{{ p.status === 'approved'
                    ? 'Signed off — ready to publish to the knowledge record.'
                    : 'Folio awaiting governance sign-off — approve to seal the record.' }}</p>
                </div>
                <div v-if="capsReady && canGovern" class="pir-verbs">
                  <template v-if="p.status === 'in_review'">
                    <button class="skey sd-mono" :disabled="busyOf(p.id)"
                      @click="$emit('pir-sign', { pir: p, mode: 'approve' })">Approve</button>
                    <button class="skey red sd-mono" :disabled="busyOf(p.id)"
                      @click="$emit('pir-sign', { pir: p, mode: 'reject' })">Reject</button>
                  </template>
                  <button v-else class="skey sd-mono" :disabled="busyOf(p.id) || !canPublish"
                    :title="canPublish ? 'Publish to the knowledge record' : 'Publishing is an admin action'"
                    @click="$emit('pir-publish', p)">Publish ▸</button>
                </div>
              </div>
              <div v-if="!pirCards.length" class="pir-card g calm sd-mono">
                NO FOLIOS IN THE QUEUE — THE RECORD IS CURRENT.</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── MID STRATUM · LIVE FLEET ── -->
      <div ref="midLayer" class="layer layer-mid" data-f="mid">
        <div class="lscale">
          <span class="stratum-tag fleet-tag sd-mono">MID STRATUM — LIVE FLEET · {{ fleetN }} OPEN ·
            SEV1 WARM &amp; LARGE</span>
          <button v-for="c in fleetChips" :key="String(c.row.id)" class="fchip g spec"
            :class="{ s1: c.row.sev === 1, 'is-breach': c.breach,
                      'is-sel': sheetId != null && String(sheetId) === String(c.row.id),
                      flash: isFresh(c.row.id) }"
            :style="{ left: `${c.x}%`, top: `${c.y}%` }"
            @click="openSheet(c.row)" @pointerenter="$emit('peek', c.row.id)">
            <span class="f-top">
              <span class="f-id sd-mono">{{ c.row.ticket_number }}</span>
              <span class="fsev sd-mono" :class="c.row.sev === 1 ? 'v1' : 'v2'">SEV{{ c.row.sev }}</span>
            </span>
            <span class="f-sub">{{ c.row.subject }}</span>
            <span class="f-meta">
              <i class="fav sd-mono" :class="{ ghost: !c.row.assigned_agent_name }">
                {{ initials(c.row.assigned_agent_name) }}</i>
              <span class="f-watch sd-mono"><Eye :size="11" /> {{ watchersOf(c.row.id) ?? '—' }}</span>
              <span v-if="c.flag" class="f-flag sd-mono" :class="{ red: c.flagRed }">{{ c.flag }}</span>
              <span class="f-sla sd-mono" :class="c.slaCls">{{ c.sla }}</span>
            </span>
          </button>
          <div v-if="!fleetChips.length" class="fleet-calm g sd-mono">
            THE LENS IS QUIET — NO LIVE SEV1∪SEV2 ON THE BOARD.</div>
        </div>
      </div>

      <!-- ── FRONT STRATUM · MI DOCKET ── -->
      <div ref="frontLayer" class="layer layer-front" data-f="front">
        <div class="lscale">
          <div class="docket g spec" :class="{ hot: !!docket, pulse: docketPulse }">
            <template v-if="docket">
              <span class="stratum-tag dk sd-mono">FRONT STRATUM — MI DOCKET · 1 CANDIDATE</span>
              <div class="d-id">
                <span class="d-num sd-mono">{{ docket.ticket_number }} · SEV{{ docket.sev }} → MAJOR-INCIDENT?</span>
                <span class="d-chip gold sd-mono">PROPOSED {{ elapsed(secSince(docket.mi_proposed_at)) }} AGO</span>
              </div>
              <h3 class="d-sub">{{ docket.subject }}</h3>
              <blockquote class="d-note">
                <template v-if="docket.mi_proposal_note">“{{ docket.mi_proposal_note }}”</template>
                <template v-else>Proposed for major-incident status from the response tier.</template>
                <small class="sd-mono">proposed by <b>{{ docket.mi_proposed_by_name || 'AGENT' }}</b>
                  · owner {{ docket.assigned_agent_name || 'UNOWNED' }}
                  · cmdr <b>{{ docket.incident_commander_name || 'UNSTAFFED' }}</b></small>
              </blockquote>
              <div class="d-chips">
                <span v-if="docket.affected_users != null" class="d-chip sd-mono">
                  {{ fmtNum(docket.affected_users) }} USERS</span>
                <span v-if="docket.compliance_impact" class="d-chip sd-mono">COMPLIANCE</span>
                <span v-if="docket.security_impact" class="d-chip sd-mono">SECURITY</span>
                <span v-if="docket.public_impact" class="d-chip sd-mono">PUBLIC</span>
                <span v-if="similarN" class="d-chip gold sd-mono" :class="{ pulse: similarRepeat }">
                  SIMILAR ×{{ similarN }} / 180D</span>
                <span class="d-chip sd-mono">{{ dkWatch != null ? `${dkWatch} WATCHERS` : 'WATCHERS —' }}</span>
              </div>
              <div v-if="capsReady && canRule(docket)" class="d-verbs">
                <button class="dkey hot sd-mono" :disabled="busyOf(docket.id)"
                  @click="$emit('confirm-mi', { row: docket })"><Check :size="12" /> Confirm MI</button>
                <button class="dkey red sd-mono" :disabled="busyOf(docket.id)"
                  @click="$emit('decline-mi', docket)"><FlagOff :size="12" /> Decline</button>
              </div>
              <p v-else-if="capsReady" class="d-gate sd-mono">
                RULING IS LEAD / ADMIN AUTHORITY — THIS GLASS IS READ-ONLY.</p>
              <p class="d-meta sd-mono">on confirm: <b>war room</b> auto-opens · <b>commander</b> staffed
                from roster · audience broadcast to
                <b>{{ dkWatch != null ? `${dkWatch} watchers` : 'the watchers' }}</b></p>
            </template>
            <template v-else>
              <span class="stratum-tag dk sd-mono">FRONT STRATUM — MI DOCKET · CLEAR</span>
              <h3 class="d-sub clear">The docket is clear.</h3>
              <p class="d-clear sd-mono">
                <template v-if="lastRuling">LAST RULING — {{ lastRuling }}</template>
                <template v-else>{{ mi30d }} RULINGS / 30D · THE NEXT CANDIDATE CLAIMS THIS GLASS THE
                  MOMENT IT'S PROPOSED.</template></p>
              <p class="d-meta sd-mono">a proposal racks this stratum forward — <b>confirm</b> opens the
                war room · <b>decline</b> returns a note to the proposer.</p>
            </template>
          </div>
        </div>
      </div>

      <!-- arrival sweep across the strata -->
      <span class="oh-sweep" :class="{ run: sweepRun }" aria-hidden="true" />

      <!-- ── VERB SHEET — slides in from the stage's right edge ── -->
      <Presence>
        <Motion v-if="sheetRow" key="oh-scrim" as="button" class="sheet-scrim" aria-label="Close verb sheet"
          :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
          :transition="{ duration: reduced ? 0 : 0.3 }" @click="closeSheet" />
      </Presence>
      <Presence>
        <Motion v-if="sheetRow" key="oh-sheet" as="aside" class="sheet" role="dialog"
          aria-label="Incident verb sheet"
          :initial="{ x: '108%' }" :animate="{ x: 0 }" :exit="{ x: '108%' }"
          :transition="{ duration: reduced ? 0 : 0.55, ease: [0.16, 1, 0.3, 1] }">
          <button class="sheet-close" aria-label="Close" @click="closeSheet"><X :size="13" /></button>
          <span class="s-lab sd-mono">VERB SHEET · <i>LIVE READOUT</i></span>
          <p class="s-id sd-mono">{{ sheetRow.ticket_number }} · SEV{{ sheetRow.sev }}{{
            sheetRow.is_major_incident ? ' · MI'
              : (sheetRow.mi_proposed_at ? ' · MI-CANDIDATE' : '') }}</p>
          <h3 class="s-sub">{{ sheetRow.subject }}</h3>
          <div class="s-tele">
            <div class="row1">
              <span class="s-big sd-mono" :class="{ warn: slaWarn(sheetRow) }">{{ slaShort(sheetRow) }}</span>
              <span class="s-tl sd-mono">{{ slaLbl(sheetRow) }}</span>
            </div>
            <p class="s-cad sd-mono">
              <template v-if="cadSec(sheetRow) == null">CADENCE — NONE SET · ARMS ON MI CONFIRM OR VIA THE DRAWER</template>
              <template v-else-if="cadSec(sheetRow) < 0">CADENCE — <b class="esc">OVERDUE
                +{{ mmss(-cadSec(sheetRow)) }}</b> · EVERY {{ sheetRow.update_interval_minutes || '—' }}M</template>
              <template v-else>CADENCE — NEXT UPDATE <b>{{ mmss(cadSec(sheetRow)) }}</b> · EVERY
                {{ sheetRow.update_interval_minutes || '—' }}M</template></p>
          </div>
          <div class="s-facts">
            <span class="s-fact sd-mono">OWNER<b>{{ sheetRow.assigned_agent_name || 'UNOWNED' }}</b></span>
            <span class="s-fact sd-mono">COMMANDER<b>{{ sheetRow.incident_commander_name
              || (sheetRow.sev === 1 ? 'UNSTAFFED' : '—') }}</b></span>
            <span class="s-fact sd-mono">USERS IN BLAST<b>{{ fmtNum(sheetRow.affected_users) }}</b></span>
            <span class="s-fact sd-mono">WATCHERS<b>{{ watchersOf(sheetRow.id) ?? '—' }}</b></span>
          </div>
          <div class="s-exp">
            <span v-for="t in expOf(sheetRow)" :key="t" class="d-chip sd-mono"
              :class="{ gold: t !== 'UNASSESSED' }">{{ t }}</span>
          </div>
          <div class="s-pb">
            <span class="s-lab sd-mono">PLAYBOOK</span>
            <template v-if="sheetRow.task_total">
              <span class="pbm"><i v-for="k in pbSegs(sheetRow).n" :key="k"
                :class="{ f: k <= pbSegs(sheetRow).filled }" /></span>
              <small class="sd-mono"><b>{{ sheetRow.task_done }}/{{ sheetRow.task_total }}</b>
                {{ tplKey(sheetRow) }}</small>
            </template>
            <small v-else class="sd-mono none">— NO PLAYBOOK APPLIED · READ-ONLY FROM THIS DESK</small>
          </div>
          <div class="s-verbs">
            <template v-if="capsReady && canGovern">
              <button class="vkey sd-mono" :disabled="busyOf(sheetRow.id)"
                @click="$emit('assign', sheetRow)"><UserPlus :size="12" /> Assign</button>
              <button v-if="sheetRow.assigned_agent_id" class="vkey sd-mono" :disabled="busyOf(sheetRow.id)"
                @click="$emit('nudge', sheetRow)"><BellRing :size="12" /> Nudge owner</button>
              <button class="vkey sd-mono" :disabled="busyOf(sheetRow.id)"
                @click="$emit('roster', sheetRow)"><Crown :size="12" /> Roster</button>
              <button v-if="sheetRow.sev >= 3 && !sheetRow.is_major_incident" class="vkey sd-mono"
                :disabled="busyOf(sheetRow.id)"
                @click="$emit('reclassify', { row: sheetRow, direction: 'promote' })">
                <ArrowUpDown :size="12" /> Reclassify</button>
              <button class="vkey sd-mono" :disabled="busyOf(sheetRow.id)"
                @click="$emit('escalate', sheetRow)"><ChevronsUp :size="12" /> Escalate</button>
              <button v-if="canRule(sheetRow) && sheetRow.sev === 2 && !sheetRow.is_major_incident"
                class="vkey sd-mono" :disabled="busyOf(sheetRow.id)"
                title="SEV2 → SEV3 — reason-gated, logged to the audit chain"
                @click="$emit('reclassify', { row: sheetRow, direction: 'de_escalate' })">
                <ChevronsDown :size="12" /> De-escalate</button>
              <button class="vkey sd-mono" :disabled="busyOf(sheetRow.id)"
                @click="$emit('watchers', sheetRow)"><Eye :size="12" /> Watchers</button>
            </template>
            <button class="vkey sd-mono" :disabled="busyOf(sheetRow.id)"
              @click="$emit('sitrep', sheetRow)"><FileText :size="12" /> Sitrep PDF</button>
          </div>
          <p v-if="capsReady && !canGovern" class="s-gate sd-mono">
            GOVERNANCE VERBS ARE LEAD / ADMIN AUTHORITY — THIS READOUT IS READ-ONLY.</p>
          <button class="s-open sd-mono" @click="$emit('open', sheetRow.id)">
            OPEN FULL INCIDENT <ArrowUpRight :size="12" /></button>
          <p class="s-note sd-mono">ADMIN VERBS ONLY — NO ACK ON THIS DESK</p>
        </Motion>
      </Presence>
    </div>
  </section>
</template>

<script setup>
/*
  Contract: pure projection of the section's data spine — rows/stats ride
  useCriticalDesk (chip counts ONLY through CRIT_LENSES selectors), PIR folios +
  landed shelf + similar intel arrive as props, watcher counts are HONEST-LAZY via
  the peekOf function prop (hero emits `peek` on chip hover / sheet open / docket
  presence; the section's cache settles the number in). Every verb emits UP — the
  section's existing handlers stay the single business-logic path. `hold` mirrors
  the verb sheet's open state into the section's uiHold so the poll never yanks
  the sheet's row. Parallax = one rAF loop lerping three layer transforms;
  reduced → static frame (no loop, no sweep, instant sheet).
  TDZ discipline: every ref/helper is declared before the computeds that read it.
*/
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  Radio, Eye, X, Check, FlagOff, UserPlus, BellRing, Crown, ArrowUpDown, ChevronsUp,
  ChevronsDown, FileText, ArrowUpRight,
} from 'lucide-vue-next'
import { CRIT_LENSES } from '../composables/useCriticalDesk'
import { isPossibleRepeat } from '../composables/useIncidentPeek'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  stats: { type: Object, default: null },
  now: { type: Number, default: () => Date.now() },
  arrivals: { type: Object, default: () => ({ count: 0, ids: [] }) },
  reduced: { type: Boolean, default: false },
  busyId: { type: [String, Number], default: null },
  pirs: { type: Array, default: () => [] },          // in_review folios
  pirsApproved: { type: Array, default: () => [] },  // approved, awaiting publish
  landed: { type: Array, default: () => [] },        // terminal shelf rows
  intel: { type: Object, default: null },            // { base, items } from useIncidentPeek
  lastRuling: { type: String, default: '' },
  capsReady: { type: Boolean, default: false },
  canGovern: { type: Boolean, default: false },
  // Publishing a PIR to the knowledge record is superuser-only on the backend — gate the
  // verb to match (fail-closed). Approve/reject stay on canGovern (leads can review).
  canPublish: { type: Boolean, default: false },
  canRule: { type: Function, default: () => false },
  activeLens: { type: String, default: null },
  peekOf: { type: Function, default: () => null },   // (id) → reactive peek state | null
})
const emit = defineEmits([
  'lens', 'go', 'open', 'peek', 'hold', 'confirm-mi', 'decline-mi', 'assign', 'nudge',
  'roster', 'reclassify', 'escalate', 'watchers', 'sitrep', 'pir-sign', 'pir-publish',
])

/* ── helpers (before any computed — TDZ) ── */
const pad = (n) => String(n).padStart(2, '0')
const mmss = (s) => { s = Math.max(0, s | 0); return `${pad((s / 60) | 0)}:${pad(s % 60)}` }
const hms = (s) => { s = Math.max(0, s | 0); return `${(s / 3600) | 0}:${pad(((s % 3600) / 60) | 0)}:${pad(s % 60)}` }
/* compact live elapsed — mm:ss while fresh, then h/d so a stale proposal stays readable */
const elapsed = (s) => {
  s = Math.max(0, s | 0)
  if (s < 3600) return mmss(s)
  if (s < 86400) return `${(s / 3600) | 0}H ${pad(((s % 3600) / 60) | 0)}M`
  return `${(s / 86400) | 0}D ${((s % 86400) / 3600) | 0}H`
}
const secSince = (ts) => (ts ? Math.max(0, Math.floor((props.now - new Date(ts).getTime()) / 1000)) : 0)
const secUntil = (ts) => Math.floor((new Date(ts).getTime() - props.now) / 1000)
const minSince = (ts) => Math.floor(secSince(ts) / 60)
const minLabel = (m) => (m == null ? '—' : m >= 1440 ? `${Math.floor(m / 1440)}d` : m >= 60 ? `${Math.floor(m / 60)}h` : `${m}m`)
const fmtNum = (n) => (n == null ? '—' : Number(n).toLocaleString('en-US'))
const initials = (n) => String(n || '?').split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
const TERMINAL = new Set(['resolved', 'closed', 'archived'])
const liveRow = (r) => !TERMINAL.has(String(r.status || '')) && !r.merged_into_id
const busyOf = (id) => props.busyId != null && String(props.busyId) === String(id)
const statOf = (key) => (CRIT_LENSES[key] ? CRIT_LENSES[key].stat(props.stats || {}) : 0)
const watchersOf = (id) => props.peekOf(id)?.sitrep?.watchers_total ?? null
const tplKey = (r) => props.peekOf(r.id)?.tasks?.items?.[0]?.template_key || ''

/* SLA + cadence readouts (mirrors SdIncGovBoard so the sheet never contradicts the board) */
const AT_RISK_SEC = 4 * 3600
const isBreached = (r) => !!(r.sla_resolution_breached || r.sla_response_breached)
const breachDue = (r) => (r.sla_resolution_breached ? (r.resolution_due_at || r.created_at)
  : (r.response_due_at || r.created_at))
const slaShort = (r) => {
  if (r.sla_paused_since) return 'PAUSED'
  if (isBreached(r)) return `+${hms(secSince(breachDue(r)))}`
  if (r.resolution_due_at) return hms(Math.max(0, secUntil(r.resolution_due_at)))
  return '—'
}
const slaLbl = (r) => {
  if (r.sla_paused_since) return 'SLA HELD'
  if (isBreached(r)) return 'BREACHED'
  if (r.resolution_due_at && secUntil(r.resolution_due_at) <= AT_RISK_SEC) return 'AT-RISK'
  return 'TO BREACH'
}
const slaWarn = (r) => isBreached(r)
  || !!(r.resolution_due_at && !r.sla_paused_since && secUntil(r.resolution_due_at) <= AT_RISK_SEC)
const cadSec = (r) => (r.next_update_due_at ? secUntil(r.next_update_due_at) : null)
const expOf = (r) => {
  const out = []
  if (r.revenue_impact) out.push('REVENUE')
  if (r.compliance_impact) out.push('COMPLIANCE')
  if (r.security_impact) out.push('SECURITY')
  if (r.public_impact) out.push('PUBLIC')
  if (!out.length && r.affected_users == null && !r.business_impact) out.push('UNASSESSED')
  return out
}
const pbSegs = (r) => {
  const total = Number(r.task_total) || 0
  const n = Math.min(total, 14)
  const filled = total ? Math.round(((Number(r.task_done) || 0) / total) * n) : 0
  return { n, filled }
}

/* landed shelf labels (same vocabulary as the bento shelf) */
const pirTag = (it) => (it.pir_status === 'approved' || it.pir_status === 'published' ? 'PIR APPROVED'
  : it.has_pir ? 'PIR FILED' : 'PIR OWED')
const pirTagCls = (it) => (it.pir_status === 'approved' || it.pir_status === 'published' ? 'ok'
  : it.has_pir ? 'ok' : 'owed')
const mttrOf = (it) => {
  const end = it.resolved_at || it.closed_at
  if (!end) return '—'
  const start = it.incident_detected_at || it.created_at
  const m = Math.max(0, Math.round((new Date(end) - new Date(start)) / 60000))
  return `${Math.floor(m / 60)}h${pad(m % 60)}m`
}
const landedAge = (it) => {
  const m = minSince(it.resolved_at || it.closed_at || it.created_at)
  return m >= 1440 ? `${Math.floor(m / 1440)}D` : m >= 60 ? `${Math.floor(m / 60)}H` : `${m}M`
}
const pirAge = (p) => minLabel(minSince(p.updated_at || p.created_at)).toUpperCase()

/* ── selector-backed readouts ── */
const sev1 = computed(() => statOf('sev1'))
const sev2 = computed(() => statOf('sev2'))
const breached = computed(() => statOf('breached'))
const docketN = computed(() => statOf('mi_proposed'))
const fleetN = computed(() => sev1.value + sev2.value)
const pirReview = computed(() => props.stats?.pir?.in_review ?? 0)
const pirTotal = computed(() => props.pirs.length + props.pirsApproved.length)
const mi30d = computed(() => (props.stats?.critical?.mi_confirmed_30d ?? 0)
  + (props.stats?.critical?.mi_declined_30d ?? 0))
const clock = computed(() => new Date(props.now).toLocaleTimeString([],
  { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
const tzShort = (() => {
  try {
    return new Intl.DateTimeFormat([], { timeZoneName: 'short' })
      .formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value || ''
  } catch { return '' }
})()
const arriveN = computed(() => props.arrivals?.count || 0)

/* ── strata exemplars ── */
const docket = computed(() => props.rows.find(
  (r) => r.mi_proposed_at && !r.is_major_incident && liveRow(r)) || null)
const dkWatch = computed(() => (docket.value ? watchersOf(docket.value.id) : null))
const similarItems = computed(() => {
  if (!props.intel?.base || !docket.value) return []
  if (String(props.intel.base.id) !== String(docket.value.id)) return []
  return Array.isArray(props.intel.items) ? props.intel.items : []
})
const similarN = computed(() => similarItems.value.length)
const similarRepeat = computed(() => isPossibleRepeat(similarItems.value))

/* fleet scatter — deterministic depth-offset slots (percent of the stage) */
const SLOTS = [
  { x: 30, y: 6 }, { x: 55, y: 36 }, { x: 77, y: 8 }, { x: 7, y: 4 },
  { x: 73, y: 58 }, { x: 43, y: 64 }, { x: 10, y: 38 }, { x: 58, y: 76 },
]
const fleetChips = computed(() => props.rows.filter(liveRow).slice(0, SLOTS.length)
  .map((r, i) => {
    const over = cadSec(r) != null && cadSec(r) < 0
    let flag = ''
    let flagRed = false
    if (isBreached(r)) { flag = 'BREACHED'; flagRed = true }
    else if (!r.acknowledged_at && !r.assigned_agent_name) { flag = 'UNOWNED · UNACKED'; flagRed = true }
    else if (!r.acknowledged_at) { flag = 'UNACKED'; flagRed = true }
    else if (r.mi_proposed_at && !r.is_major_incident) flag = 'MI-CANDIDATE'
    else if (r.war_room_url || r.is_major_incident) flag = r.child_count ? `WAR ROOM · ${r.child_count}` : 'WAR ROOM'
    else if (over) { flag = 'UPDATE OVERDUE'; flagRed = true }
    const slaCls = r.sla_paused_since ? 'paused' : (slaWarn(r) ? 'warn' : '')
    return { row: r, ...SLOTS[i], flag, flagRed, sla: slaShort(r), slaCls, breach: isBreached(r) }
  }))

/* record strata */
const landedCards = computed(() => props.landed.slice(0, 4))
const pirCards = computed(() => [...props.pirs, ...props.pirsApproved].slice(0, 2))

/* ── rack focus (default: front when a candidate holds the docket, else mid) ── */
const focus = ref('mid')
const userRacked = ref(false)
const docketPulse = ref(false)
let pulseTimer = null
const rack = (f) => { userRacked.value = true; focus.value = f }
watch(() => !!docket.value, (has) => {
  if (!userRacked.value) focus.value = has ? 'front' : 'mid'
}, { immediate: true })
const stackRef = ref(null)
const ctaDocket = () => {
  rack('front')
  docketPulse.value = false
  requestAnimationFrame(() => { docketPulse.value = true })
  clearTimeout(pulseTimer)
  pulseTimer = setTimeout(() => { docketPulse.value = false }, 1700)
  stackRef.value?.scrollIntoView({ behavior: props.reduced ? 'auto' : 'smooth', block: 'nearest' })
}
/* clicking a defocused stratum racks focus first (capture — verbs don't fire through blur);
   a fleet chip click is allowed through so rack + sheet land in one gesture */
const onStackClick = (e) => {
  const layer = e.target.closest('.layer')
  if (!layer) return
  const f = layer.dataset.f
  if (focus.value !== f) {
    rack(f)
    if (!e.target.closest('.fchip')) { e.stopPropagation(); e.preventDefault() }
  }
}

/* ── verb sheet ── */
const sheetId = ref(null)
const sheetSnap = ref(null)
const sheetRow = computed(() => (sheetId.value == null ? null
  : props.rows.find((r) => String(r.id) === String(sheetId.value)) || sheetSnap.value))
const openSheet = (r) => {
  sheetId.value = r.id
  sheetSnap.value = r
  emit('peek', r.id)
  emit('hold', true)
}
const closeSheet = () => {
  if (sheetId.value == null) return
  sheetId.value = null
  sheetSnap.value = null
  emit('hold', false)
}
const onKey = (e) => { if (e.key === 'Escape') closeSheet() }

/* ── pointer parallax + ambient drift (one rAF, three layer transforms) ── */
const frontLayer = ref(null)
const midLayer = ref(null)
const backLayer = ref(null)
const RATE = { front: [18, 12], mid: [10, 7], back: [5, 3.5] }
let tx = 0; let ty = 0; let cx = 0; let cy = 0
let raf = null
const onMove = (e) => {
  const b = stackRef.value?.getBoundingClientRect()
  if (!b || !b.width) return
  tx = ((e.clientX - b.left) / b.width) * 2 - 1
  ty = ((e.clientY - b.top) / b.height) * 2 - 1
}
const onLeave = () => { tx = 0; ty = 0 }
const loop = (t) => {
  raf = requestAnimationFrame(loop)
  if (document.hidden) return
  cx += (tx - cx) * 0.055
  cy += (ty - cy) * 0.055
  const dr = Math.sin(t / 4600) * 0.3
  const dr2 = Math.cos(t / 5400) * 0.3
  const layers = [['front', frontLayer], ['mid', midLayer], ['back', backLayer]]
  layers.forEach(([k, r], i) => {
    if (!r.value) return
    const [rx, ry] = RATE[k]
    const ox = (cx + dr * (1 - i * 0.3)) * rx
    const oy = (cy + dr2 * (1 - i * 0.3)) * ry
    r.value.style.transform = `translate3d(${ox.toFixed(2)}px,${oy.toFixed(2)}px,0)`
  })
}
/* the host resolves `reduced` in ITS onMounted (after this child mounts) — react to
   the late flip so reduced-motion users end on one static designed frame */
watch(() => props.reduced, (v) => {
  if (v) {
    cancelAnimationFrame(raf); raf = null
    const layers = [frontLayer, midLayer, backLayer]
    layers.forEach((r) => { if (r.value) r.value.style.transform = '' })
  } else if (!raf) raf = requestAnimationFrame(loop)
})

/* ── arrivals: one sweep pass + a flash on the fresh chips ── */
const sweepRun = ref(false)
const freshIds = ref([])
let sweepTimer = null
let freshTimer = null
watch(() => props.arrivals?.count, (n, o) => {
  if (!n || n <= (o || 0)) return
  freshIds.value = (props.arrivals?.ids || []).map(String)
  clearTimeout(freshTimer)
  freshTimer = setTimeout(() => { freshIds.value = [] }, 1900)
  if (props.reduced) return
  sweepRun.value = false
  clearTimeout(sweepTimer)
  requestAnimationFrame(() => { sweepRun.value = true })
  sweepTimer = setTimeout(() => { sweepRun.value = false }, 1700)
})
const isFresh = (id) => freshIds.value.includes(String(id))

/* honest watcher count on the docket — warm the peek cache the moment a candidate lands */
watch(() => docket.value?.id, (id) => { if (id != null) emit('peek', id) }, { immediate: true })

/* ── entrance + lifecycle ── */
const ready = ref(false)
onMounted(() => {
  requestAnimationFrame(() => { ready.value = true })
  window.addEventListener('keydown', onKey)
  if (!props.reduced) raf = requestAnimationFrame(loop)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  if (sheetId.value != null) emit('hold', false)
  cancelAnimationFrame(raf)
  clearTimeout(sweepTimer); clearTimeout(freshTimer); clearTimeout(pulseTimer)
})
</script>

<style scoped>
/* ═══ B6 OBSIDIAN GLASS — materials ARE the identity: multi-layer backdrop blur,
   1px inner top-light edges, specular sweeps, orange bloom on obsidian.
   Chrome above the stage = theme-native tokens; INSIDE .stack everything rides the
   literal obsidian palette below so the stage reads identical in BOTH themes. ═══ */
.oh { position: relative; overflow: hidden; border-radius: 26px; padding: 24px 28px 28px;
  border: 1px solid var(--sd-border);
  background:
    radial-gradient(120% 90% at 70% -10%, color-mix(in srgb, var(--sd-fun-core) 12%, transparent), transparent 55%),
    radial-gradient(90% 80% at 10% 110%, var(--sd-fun-deep-soft), transparent 60%),
    var(--sd-canvas); }

/* ambient obsidian field — volumetric gradient drift */
.oh-ambient { position: absolute; inset: 0; pointer-events: none; }
.blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.5; }
.blob.b1 { width: 640px; height: 460px; left: -160px; top: -180px;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--sd-fun-core) 17%, transparent), transparent 70%);
  animation: oh-drift1 34s ease-in-out infinite alternate; }
.blob.b2 { width: 540px; height: 440px; right: -140px; top: 80px;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--sd-fun-deep) 22%, transparent), transparent 70%);
  animation: oh-drift2 41s ease-in-out infinite alternate; }
.blob.b3 { width: 460px; height: 380px; left: 36%; bottom: -240px;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--sd-fun-hi) 10%, transparent), transparent 70%);
  animation: oh-drift1 47s ease-in-out infinite alternate-reverse; }
@keyframes oh-drift1 { from { transform: translate3d(0, 0, 0) scale(1); } to { transform: translate3d(70px, 45px, 0) scale(1.12); } }
@keyframes oh-drift2 { from { transform: translate3d(0, 0, 0) scale(1.08); } to { transform: translate3d(-60px, 55px, 0) scale(0.96); } }

/* entrance — masthead → headline → tab bar → stage */
.rise { opacity: 0; transform: translateY(18px); }
.oh.is-ready .rise { opacity: 1; transform: none;
  transition: opacity 1s var(--sd-spring), transform 1s var(--sd-spring); }
.oh.is-ready .rise.d1 { transition-delay: 0.07s; }
.oh.is-ready .rise.d2 { transition-delay: 0.16s; }
.oh.is-ready .rise.d3 { transition-delay: 0.28s; }

/* ── a · masthead ── */
.oh-mast { position: relative; display: flex; justify-content: space-between; align-items: baseline;
  gap: 16px; flex-wrap: wrap; }
.oh-crumb { font-size: 10px; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--sd-text-dim); }
.oh-crumb b { color: var(--sd-fun-core); font-weight: 700; }
.oh-clock { font-size: 11.5px; letter-spacing: 0.08em; color: var(--sd-text-dim);
  font-variant-numeric: tabular-nums; }
.oh-clock b { color: var(--sd-text-secondary); font-weight: 600; }

/* ── b · display headline ── */
.oh-hero { position: relative; padding: 34px 0 6px; }
.oh-h1 { margin: 0; font-size: clamp(36px, 4.4vw, 60px); font-weight: 200; letter-spacing: -0.02em;
  line-height: 1.05; color: var(--sd-text); text-wrap: balance; max-width: 20ch; }
.oh-h1 em { font-style: normal; font-weight: 500; background: var(--sd-fun-grad);
  -webkit-background-clip: text; background-clip: text; color: transparent; }
.oh-sub { margin: 15px 0 0; font-size: 13.5px; line-height: 1.65; color: var(--sd-text-muted);
  max-width: 66ch; font-weight: 350; }
.oh-sub b { color: var(--sd-text-secondary); font-weight: 600; }
.oh-ctas { display: flex; align-items: center; gap: 13px; flex-wrap: wrap; margin-top: 22px; }
.oh-key { font-family: var(--sd-mono); font-size: 10.5px; font-weight: 600; letter-spacing: 0.16em;
  text-transform: uppercase; padding: 12px 22px; border-radius: 12px; cursor: pointer;
  color: var(--sd-text-secondary); border: 1px solid var(--sd-border-strong);
  background: var(--sd-surface);
  -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14);
  transition: transform 0.35s var(--sd-spring), color 0.3s, border-color 0.3s,
    box-shadow 0.35s var(--sd-spring); }
.oh-key:hover { transform: translateY(-2px); color: var(--sd-text); border-color: var(--sd-fun-brd);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14), 0 14px 34px -12px var(--sd-fun-soft); }
.oh-key.hot { background: var(--sd-fun-grad); border-color: transparent; color: #190a00;
  box-shadow: 0 16px 40px -12px color-mix(in srgb, var(--sd-fun-core) 55%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.45); }
.oh-key.hot:hover { filter: brightness(1.05); color: #190a00; }
.oh-arrive { display: inline-flex; align-items: center; gap: 5px; padding: 8px 13px; border-radius: 20px;
  font-size: 8.5px; font-weight: 800; letter-spacing: 0.18em; color: var(--sd-fun-hi);
  border: 1px dashed var(--sd-fun-brd); background: var(--sd-fun-soft); }
.oh-arr-enter-active, .oh-arr-leave-active { transition: opacity 0.4s, transform 0.4s var(--sd-spring); }
.oh-arr-enter-from, .oh-arr-leave-to { opacity: 0; transform: translateY(6px); }

/* ── c · strata tab bar + legend ── */
.stack-bar { position: relative; display: flex; justify-content: space-between; align-items: center;
  gap: 20px; flex-wrap: wrap; margin-top: 30px; }
.stabs { display: inline-flex; gap: 4px; padding: 4px; border-radius: 12px;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface);
  -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12); }
.stab { font-size: 10px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--sd-text-dim); padding: 9px 17px; border-radius: 9px; cursor: pointer;
  border: 0; background: none; font-family: var(--sd-mono);
  transition: color 0.3s, background 0.3s, box-shadow 0.35s var(--sd-spring); }
.stab:hover { color: var(--sd-text-secondary); }
.stab.on { color: #190a00; background: var(--sd-fun-grad);
  box-shadow: 0 8px 22px -8px color-mix(in srgb, var(--sd-fun-core) 60%, transparent); }
.stack-legend { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.leg { font-size: 10px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase;
  padding: 7px 12px; border-radius: 9px; color: var(--sd-text-dim); cursor: pointer;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface);
  transition: color 0.3s, border-color 0.3s, transform 0.3s var(--sd-spring); }
.leg:hover { transform: translateY(-1px); color: var(--sd-text-secondary); }
.leg b { color: var(--sd-text-secondary); }
.leg.red b { color: var(--sd-fun-esc); }
.leg.zero { opacity: 0.55; }
.leg.on { color: var(--sd-fun-core); border-color: var(--sd-fun-brd); }
.leg.on b { color: var(--sd-fun-core); }
.stack-hint { font-size: 9px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--sd-text-dim); }

/* ═══ d · THE SPATIAL GLASS STAGE — obsidian in BOTH themes (display-panel rule).
   Local literal palette: everything inside rides these, never theme tokens. ═══ */
.stack { position: relative; height: 700px; margin-top: 16px; border-radius: 26px; overflow: hidden;
  border: 1px solid rgba(251, 146, 60, 0.14);
  --st-text: #f4f6f8; --st-text2: #c2c7cd; --st-text3: #868d95;
  --st-core: #fb923c; --st-hi: #ffc46b; --st-esc: #f0564a; --st-res: #34d399;
  --st-brd: rgba(251, 146, 60, 0.3); --st-bloom: rgba(251, 146, 60, 0.16);
  --st-edge: rgba(255, 255, 255, 0.16); --st-border: rgba(255, 255, 255, 0.14);
  --st-grad: linear-gradient(122deg, #ffc46b 0%, #fb923c 48%, #8a4f16 100%);
  background:
    radial-gradient(120% 90% at 70% -10%, var(--st-bloom), transparent 55%),
    radial-gradient(90% 80% at 10% 110%, rgba(138, 79, 22, 0.12), transparent 60%),
    var(--sd-fun-wall); }

.layer { position: absolute; inset: 0; pointer-events: none; will-change: transform; }
.lscale { position: absolute; inset: 0; pointer-events: none;
  transition: transform 1s var(--sd-spring), filter 1s var(--sd-spring), opacity 1s var(--sd-spring); }
.lscale > * { pointer-events: auto; }
.layer-back { z-index: 1; }
.layer-mid { z-index: 2; }
.layer-front { z-index: 3; }

/* depth-of-field focus racking (artifact matrix, verbatim) */
.stack.f-front .layer-front .lscale { transform: scale(1); filter: blur(0); opacity: 1; }
.stack.f-front .layer-mid .lscale { transform: scale(0.955); filter: blur(2.2px); opacity: 0.62; }
.stack.f-front .layer-back .lscale { transform: scale(0.905); filter: blur(4.5px); opacity: 0.4; }
.stack.f-mid .layer-front .lscale { transform: scale(1.055); filter: blur(5px); opacity: 0.26; }
.stack.f-mid .layer-mid .lscale { transform: scale(1); filter: blur(0); opacity: 1; }
.stack.f-mid .layer-back .lscale { transform: scale(0.94); filter: blur(2.6px); opacity: 0.52; }
.stack.f-back .layer-front .lscale { transform: scale(1.09); filter: blur(7px); opacity: 0.16; }
.stack.f-back .layer-mid .lscale { transform: scale(1.04); filter: blur(3.2px); opacity: 0.34; }
.stack.f-back .layer-back .lscale { transform: scale(1); filter: blur(0); opacity: 1; }

.stratum-tag { font-size: 9px; font-weight: 600; letter-spacing: 0.26em; text-transform: uppercase;
  color: var(--st-text3); pointer-events: none !important; }

/* the obsidian glass recipe — literal, identical both themes */
.g { background: rgba(22, 24, 27, 0.66);
  -webkit-backdrop-filter: blur(26px) saturate(1.35); backdrop-filter: blur(26px) saturate(1.35);
  border: 1px solid var(--st-border); border-radius: 18px;
  box-shadow: inset 0 1px 0 var(--st-edge), 0 30px 70px rgba(0, 0, 0, 0.42);
  position: relative; }
.spec { overflow: hidden; }
.spec::after { content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  background: linear-gradient(105deg, transparent 42%, rgba(255, 255, 255, 0.13) 50%, transparent 58%);
  transform: translateX(-130%); transition: transform 1.1s var(--sd-spring); }
.spec:hover::after { transform: translateX(130%); }

/* ── BACK stratum · THE RECORD ── */
.record { position: absolute; left: 26px; right: 26px; top: 24px; }
.record .stratum-tag { display: block; margin-bottom: 12px; }
.record-grid { display: flex; gap: 14px; align-items: stretch; }
.land { flex: 1; min-width: 0; padding: 14px 16px; border-radius: 14px; text-align: left;
  cursor: pointer; font: inherit; color: var(--st-text);
  transition: transform 0.4s var(--sd-spring), border-color 0.3s; }
.land:hover { transform: translateY(-3px); border-color: var(--st-brd); }
.land.calm { cursor: default; font-size: 10px; letter-spacing: 0.14em; color: var(--st-text3);
  display: grid; place-items: center; text-align: center; line-height: 1.8; }
.land.calm:hover { transform: none; border-color: var(--st-border); }
.l-id { display: block; font-size: 10.5px; color: var(--st-text3); letter-spacing: 0.04em; }
.l-sub { margin: 3px 0 0; font-size: 13px; color: var(--st-text2); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; font-weight: 350; }
.l-mttr { margin: 7px 0 0; font-size: 10px; color: var(--st-text3); }
.l-mttr b { color: var(--st-text); font-weight: 500; }
.pill { display: inline-block; margin-top: 8px; font-size: 8.5px; letter-spacing: 0.16em;
  text-transform: uppercase; font-weight: 600; border: 1px solid var(--st-border);
  border-radius: 6px; padding: 3px 8px; color: var(--st-text3); }
.pill.ok { color: var(--st-res); border-color: rgba(52, 211, 153, 0.3); }
.pill.owed { color: var(--st-core); border-color: var(--st-brd);
  animation: oh-soft 1.9s ease-in-out infinite; }
@keyframes oh-soft { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }

.pirq { display: flex; gap: 14px; margin-top: 14px; }
.pir-card { flex: 1; padding: 16px 18px; border-radius: 14px; display: flex;
  justify-content: space-between; gap: 14px; align-items: center; }
.pir-card.calm { font-size: 10px; letter-spacing: 0.14em; color: var(--st-text3);
  justify-content: center; }
.pir-body { min-width: 0; }
.p-id { display: block; font-size: 11px; color: var(--st-text2); }
.p-sub { margin: 3px 0 0; font-size: 12.5px; color: var(--st-text3); font-weight: 350; }
.pir-verbs { display: flex; gap: 8px; flex: none; }
.skey { font-family: var(--sd-mono); font-size: 9.5px; font-weight: 600; letter-spacing: 0.16em;
  text-transform: uppercase; padding: 9px 14px; border-radius: 9px; cursor: pointer;
  color: var(--st-text2); border: 1px solid var(--st-border);
  background: rgba(30, 33, 37, 0.9);
  -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
  box-shadow: inset 0 1px 0 var(--st-edge);
  transition: transform 0.3s var(--sd-spring), color 0.25s, border-color 0.25s; }
.skey:hover:not(:disabled) { transform: translateY(-1px); color: var(--st-core);
  border-color: var(--st-brd); }
.skey.red { color: var(--st-esc); border-color: rgba(240, 86, 74, 0.35); }
.skey:disabled { opacity: 0.45; cursor: default; }

/* ── MID stratum · LIVE FLEET ── */
.fleet-tag { position: absolute; left: 30px; bottom: 20px; }
.fleet-calm { position: absolute; left: 50%; top: 46%; transform: translate(-50%, -50%);
  padding: 18px 26px; border-radius: 16px; font-size: 10px; letter-spacing: 0.18em;
  color: var(--st-text3); }
.fchip { position: absolute; width: 218px; text-align: left; padding: 13px 15px 11px;
  border-radius: 16px; cursor: pointer; font: inherit; color: var(--st-text);
  transition: transform 0.45s var(--sd-spring), box-shadow 0.45s var(--sd-spring), border-color 0.3s; }
.fchip:hover { transform: translateY(-4px);
  box-shadow: inset 0 1px 0 var(--st-edge), 0 22px 44px -14px var(--st-bloom); }
.fchip.s1 { width: 262px; border-color: var(--st-brd);
  background: linear-gradient(180deg, rgba(251, 146, 60, 0.1), transparent 60%), rgba(22, 24, 27, 0.66); }
.f-top { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.f-id { font-size: 11px; color: var(--st-text2); font-weight: 500; }
.fsev { font-size: 8.5px; font-weight: 600; letter-spacing: 0.12em; padding: 2px 7px;
  border-radius: 6px; }
.fsev.v1 { background: var(--st-grad); color: #190a00; }
.fsev.v2 { border: 1px solid var(--st-brd); color: var(--st-core); }
.f-sub { display: block; font-size: 12.5px; color: var(--st-text); font-weight: 250; margin-top: 5px;
  line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden; }
.fchip.s1 .f-sub { font-size: 13.5px; }
.f-meta { display: flex; align-items: center; gap: 8px; margin-top: 9px; flex-wrap: wrap; }
.fav { width: 22px; height: 22px; border-radius: 50%; flex: none; font-style: normal;
  border: 1px solid var(--st-border); display: grid; place-items: center;
  font-size: 8px; font-weight: 600; color: var(--st-text2); }
.fav.ghost { border-style: dashed; color: var(--st-text3); }
.f-watch { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px;
  color: var(--st-text3); }
.f-flag { font-size: 8.5px; letter-spacing: 0.1em; color: var(--st-core); text-transform: uppercase;
  font-weight: 600; }
.f-flag.red { color: var(--st-esc); animation: oh-soft 1.5s ease-in-out infinite; }
.f-sla { margin-left: auto; font-size: 10.5px; font-weight: 500;
  background: var(--sd-fun-wall); color: var(--sd-fun-wall-ink);
  border: 1px solid var(--sd-fun-wall-line); border-radius: 7px; padding: 3px 8px;
  font-variant-numeric: tabular-nums; }
.f-sla.warn { color: var(--st-esc); border-color: rgba(240, 86, 74, 0.3); }
.f-sla.paused { color: var(--sd-fun-wall-dim); }
.fchip.is-breach { border-color: rgba(240, 86, 74, 0.45);
  box-shadow: inset 0 1px 0 var(--st-edge), inset 0 0 0 1px rgba(240, 86, 74, 0.22),
    0 0 34px -8px rgba(240, 86, 74, 0.4); }
.fchip.is-sel { box-shadow: inset 0 1px 0 var(--st-edge), inset 0 0 0 1.5px var(--st-core),
  0 24px 48px -14px var(--st-bloom); transform: translateY(-4px); }
.fchip.flash { animation: oh-chipflash 1.6s var(--sd-spring); }
@keyframes oh-chipflash {
  0% { box-shadow: inset 0 1px 0 var(--st-edge), 0 0 0 1.5px var(--st-hi), 0 0 44px -4px var(--st-bloom); }
  100% { box-shadow: inset 0 1px 0 var(--st-edge), 0 30px 70px rgba(0, 0, 0, 0.42); }
}

/* ── FRONT stratum · MI DOCKET ── */
.docket { position: absolute; left: 28px; bottom: 28px; width: 470px;
  padding: 22px 24px 20px; border-radius: 20px; color: var(--st-text);
  background: rgba(30, 33, 37, 0.9);
  -webkit-backdrop-filter: blur(30px) saturate(1.4); backdrop-filter: blur(30px) saturate(1.4); }
.docket.hot { background: linear-gradient(165deg, rgba(251, 146, 60, 0.13), transparent 55%),
  rgba(30, 33, 37, 0.9); }
.docket.hot::before { content: ''; position: absolute; inset: -50px; z-index: -1; border-radius: 50%;
  background: radial-gradient(closest-side, var(--st-bloom), transparent 70%);
  filter: blur(30px); pointer-events: none; }
.docket .stratum-tag { display: block; margin-bottom: 10px; }
.docket .stratum-tag.dk { color: var(--st-core); }
.docket.pulse { animation: oh-docketpulse 1.6s var(--sd-spring); }
@keyframes oh-docketpulse {
  0% { box-shadow: inset 0 1px 0 var(--st-edge), 0 0 0 2px var(--st-core),
    0 30px 80px -14px var(--st-bloom); }
  100% { box-shadow: inset 0 1px 0 var(--st-edge), 0 30px 70px rgba(0, 0, 0, 0.42); }
}
.d-id { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.d-num { font-size: 12px; color: var(--st-text2); font-weight: 500; }
.d-sub { margin: 6px 0 0; font-size: 19px; font-weight: 500; letter-spacing: -0.01em;
  line-height: 1.35; color: var(--st-text); text-wrap: balance; }
.d-sub.clear { font-weight: 250; font-size: 21px; }
.d-note { margin: 12px 0 0; padding: 12px 14px; border-radius: 12px;
  background: var(--sd-fun-wall); border: 1px solid var(--sd-fun-wall-line);
  color: var(--sd-fun-wall-ink); font-size: 13.5px; font-weight: 250; line-height: 1.55;
  font-style: italic; }
.d-note small { display: block; font-size: 9.5px; color: var(--sd-fun-wall-dim); margin-top: 7px;
  letter-spacing: 0.08em; font-style: normal; text-transform: uppercase; }
.d-note small b { color: var(--sd-fun-wall-ink); font-weight: 600; }
.d-chips { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
.d-chip { font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 600;
  border: 1px solid var(--st-border); border-radius: 7px; padding: 4px 9px; color: var(--st-text3); }
.d-chip.gold { color: var(--st-core); border-color: var(--st-brd); }
.d-chip.pulse { animation: oh-soft 1.9s ease-in-out infinite; }
.d-verbs { display: flex; gap: 10px; margin-top: 16px; }
.dkey { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  font-family: var(--sd-mono); font-size: 10.5px; font-weight: 600; letter-spacing: 0.16em;
  text-transform: uppercase; padding: 13px 10px; border-radius: 12px; cursor: pointer;
  color: var(--st-text2); border: 1px solid var(--st-border);
  background: rgba(22, 24, 27, 0.66);
  -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);
  box-shadow: inset 0 1px 0 var(--st-edge);
  transition: transform 0.35s var(--sd-spring), color 0.3s, border-color 0.3s, box-shadow 0.35s; }
.dkey:hover:not(:disabled) { transform: translateY(-2px); color: var(--st-text);
  border-color: var(--st-brd);
  box-shadow: inset 0 1px 0 var(--st-edge), 0 14px 34px -12px var(--st-bloom); }
.dkey.hot { background: var(--st-grad); border-color: transparent; color: #190a00;
  box-shadow: 0 16px 40px -12px rgba(251, 146, 60, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.45); }
.dkey.hot:hover:not(:disabled) { filter: brightness(1.05); color: #190a00; }
.dkey.red { color: var(--st-esc); border-color: rgba(240, 86, 74, 0.35); }
.dkey:disabled { opacity: 0.45; cursor: default; }
.d-gate { margin: 14px 0 0; font-size: 9.5px; letter-spacing: 0.05em; color: var(--st-esc);
  border: 1px dashed rgba(240, 86, 74, 0.4); border-radius: 9px; padding: 8px 11px; }
.d-meta { margin: 12px 0 0; font-size: 9.5px; letter-spacing: 0.06em; color: var(--st-text3);
  line-height: 1.8; }
.d-meta b { color: var(--st-text2); font-weight: 600; }
.d-clear { margin: 10px 0 0; font-size: 10px; letter-spacing: 0.1em; color: var(--st-text3);
  line-height: 1.9; }

/* arrival sweep across the strata */
.oh-sweep { position: absolute; inset: 0; z-index: 5; pointer-events: none; opacity: 0;
  background: linear-gradient(100deg, transparent 44%, rgba(255, 196, 107, 0.12) 50%, transparent 56%);
  transform: translateX(-110%); }
.oh-sweep.run { animation: oh-sweep-across 1.5s var(--sd-spring) forwards; }
@keyframes oh-sweep-across {
  0% { opacity: 1; transform: translateX(-110%); }
  100% { opacity: 1; transform: translateX(110%); }
}

/* ── VERB SHEET — right edge of the stage ── */
.sheet-scrim { position: absolute; inset: 0; z-index: 6; border: 0; cursor: pointer;
  background: rgba(4, 3, 6, 0.45); }
.sheet { position: absolute; top: 0; right: 0; bottom: 0; width: min(396px, 94%); z-index: 7;
  padding: 24px 24px 24px 26px; overflow-y: auto; text-align: left; color: var(--st-text);
  background: rgba(30, 33, 37, 0.92);
  -webkit-backdrop-filter: blur(34px) saturate(1.4); backdrop-filter: blur(34px) saturate(1.4);
  border-left: 1px solid var(--st-border);
  box-shadow: inset 1px 1px 0 var(--st-edge), -40px 0 90px rgba(0, 0, 0, 0.38);
  scrollbar-width: thin; scrollbar-color: rgba(251, 146, 60, 0.35) transparent; }
.sheet::-webkit-scrollbar { width: 6px; }
.sheet::-webkit-scrollbar-thumb { background: rgba(251, 146, 60, 0.35); border-radius: 3px; }
.sheet-close { position: absolute; top: 16px; right: 16px; width: 32px; height: 32px;
  border-radius: 50%; border: 1px solid var(--st-border); cursor: pointer; background: none;
  display: grid; place-items: center; color: var(--st-text3);
  transition: color 0.25s, border-color 0.25s; }
.sheet-close:hover { color: var(--st-esc); border-color: rgba(240, 86, 74, 0.4); }
.s-lab { display: block; font-size: 9.5px; font-weight: 600; letter-spacing: 0.24em;
  text-transform: uppercase; color: var(--st-text3); }
.s-lab i { font-style: normal; color: var(--st-core); }
.s-id { margin: 10px 0 0; font-size: 11px; color: var(--st-text3); letter-spacing: 0.1em; }
.s-sub { margin: 8px 0 0; font-size: 19px; font-weight: 350; line-height: 1.35;
  color: var(--st-text); text-wrap: balance; }
.s-tele { margin-top: 16px; padding: 15px 16px; border-radius: 13px;
  background: var(--sd-fun-wall); border: 1px solid var(--sd-fun-wall-line); }
.s-tele .row1 { display: flex; justify-content: space-between; align-items: baseline; }
.s-big { font-size: 27px; font-weight: 500; color: var(--sd-fun-wall-ink);
  font-variant-numeric: tabular-nums; }
.s-big.warn { color: var(--st-esc); }
.s-tl { font-size: 8.5px; letter-spacing: 0.2em; color: var(--sd-fun-wall-dim);
  text-transform: uppercase; }
.s-cad { margin: 8px 0 0; font-size: 9.5px; color: var(--sd-fun-wall-dim); letter-spacing: 0.06em; }
.s-cad b { color: var(--sd-fun-wall-ink); font-weight: 600; }
.s-cad b.esc { color: var(--st-esc); }
.s-facts { margin-top: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 9px 14px; }
.s-fact { font-size: 10px; color: var(--st-text3); letter-spacing: 0.04em; }
.s-fact b { display: block; color: var(--st-text2); font-weight: 600; font-size: 11.5px;
  margin-top: 1px; }
.s-exp { display: flex; gap: 7px; flex-wrap: wrap; margin-top: 14px; }
.s-pb { margin-top: 16px; display: flex; flex-direction: column; gap: 8px; }
.pbm { display: flex; gap: 2px; }
.pbm i { width: 9px; height: 9px; border: 1px solid var(--st-border); border-radius: 2px;
  font-style: normal; }
.pbm i.f { background: var(--st-core); border-color: var(--st-core); }
.s-pb small { font-size: 8.5px; color: var(--st-text3); letter-spacing: 0.08em;
  text-transform: uppercase; }
.s-pb small b { color: var(--st-text2); font-weight: 600; }
.s-pb small.none { letter-spacing: 0.1em; }
.s-verbs { margin-top: 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
.vkey { display: inline-flex; align-items: center; gap: 6px; justify-content: flex-start;
  font-family: var(--sd-mono); font-size: 9px; font-weight: 600; letter-spacing: 0.1em;
  text-transform: uppercase; padding: 11px 13px; border-radius: 9px; cursor: pointer;
  color: var(--st-text2); border: 1px solid var(--st-border);
  background: rgba(22, 24, 27, 0.66);
  -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
  box-shadow: inset 0 1px 0 var(--st-edge);
  transition: color 0.25s, border-color 0.25s, transform 0.3s var(--sd-spring); }
.vkey:hover:not(:disabled) { color: var(--st-core); border-color: var(--st-brd);
  transform: translateY(-1px); }
.vkey:disabled { opacity: 0.45; cursor: default; }
.s-gate { margin: 12px 0 0; font-size: 9.5px; color: var(--st-esc); letter-spacing: 0.04em;
  border: 1px dashed rgba(240, 86, 74, 0.4); border-radius: 9px; padding: 9px 12px; }
.s-open { display: inline-flex; align-items: center; gap: 7px; margin-top: 16px; cursor: pointer;
  font-family: var(--sd-mono); font-size: 9.5px; font-weight: 600; letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--st-core); background: none; border: 0; padding: 0;
  transition: gap 0.3s var(--sd-spring); }
.s-open:hover { gap: 11px; }
.s-note { margin: 14px 0 0; font-size: 9px; letter-spacing: 0.08em; color: var(--st-text3);
  text-transform: uppercase; }

/* ── responsive guard ── */
@media (max-width: 1280px) {
  .stack { height: 640px; }
  .docket { width: 420px; }
  .fchip { width: 196px; }
  .fchip.s1 { width: 236px; }
}
@media (max-width: 960px) {
  .oh { padding: 18px 16px 20px; }
  .stack { height: auto; padding: 14px; display: flex; flex-direction: column; gap: 12px; }
  .layer { position: static; transform: none !important; pointer-events: auto; }
  .lscale { position: static; transform: none !important; filter: none !important;
    opacity: 1 !important; }
  .record { position: static; }
  .record-grid, .pirq { flex-wrap: wrap; }
  .land { min-width: 44%; }
  .fleet-tag { position: static; display: block; margin: 2px 0 8px; }
  .fleet-calm { position: static; transform: none; }
  .fchip, .fchip.s1 { position: static; width: 100%; margin-bottom: 10px; }
  .docket { position: static; width: 100%; }
  .sheet { width: 100%; position: fixed; z-index: 2050; }
  .sheet-scrim { position: fixed; z-index: 2040; }
  .stack-hint { display: none; }
}

/* ═════ LIGHT THEME OVERRIDES ═════
   The stage + everything on it stays obsidian (display-panel rule) — only the
   chrome above the glass re-dresses for the gallery cream. */
[data-theme="light"] .oh { background:
  radial-gradient(120% 90% at 70% -10%, rgba(176, 95, 20, 0.1), transparent 55%),
  radial-gradient(90% 80% at 10% 110%, rgba(110, 61, 16, 0.08), transparent 60%),
  var(--sd-canvas); }
[data-theme="light"] .oh-key { box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75); }
[data-theme="light"] .oh-key:hover { box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75),
  0 14px 34px -12px var(--sd-fun-soft); }
[data-theme="light"] .oh-key.hot { color: #fff8ec;
  box-shadow: 0 16px 40px -12px rgba(138, 74, 16, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.35); }
[data-theme="light"] .oh-key.hot:hover { color: #fff8ec; }
[data-theme="light"] .stabs { box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75); }
[data-theme="light"] .stab.on { color: #fff8ec; }
[data-theme="light"] .blob { opacity: 0.55; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .rise { opacity: 1 !important; transform: none !important;
    transition: none !important; }
  html:not([data-cinematic="on"]) .blob,
  html:not([data-cinematic="on"]) .pill.owed,
  html:not([data-cinematic="on"]) .f-flag.red,
  html:not([data-cinematic="on"]) .d-chip.pulse,
  html:not([data-cinematic="on"]) .fchip.flash,
  html:not([data-cinematic="on"]) .docket.pulse { animation: none !important; }
  html:not([data-cinematic="on"]) .oh-sweep { display: none; }
  html:not([data-cinematic="on"]) .lscale { transition: none !important; }
}
</style>
