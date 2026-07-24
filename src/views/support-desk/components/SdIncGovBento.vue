<template>
  <!-- SdIncGovBento — "GOVERNANCE BENTO" on the obsidian stage (admin Critical desk).
       Port of the winning artifact's signature instrument: an urgency-weighted
       ADAPTIVE bento — tile size IS urgency. Every poll re-weighs the grid and the
       room re-seats itself with a real FLIP (measure → invert → play, 0.6s house
       ease). The stage (--sd-fun-wall) stays obsidian in BOTH themes. -->
  <section id="sd-gov-bento" class="stage" aria-label="Adaptive governance bento — tile size equals urgency">
    <div class="stage-top sd-mono">
      <span>GOVERNANCE BENTO · SIZE = URGENCY</span>
      <span class="stamp">WEIGHTS RECOMPUTED {{ reweighClock }}</span>
      <span class="sp" />
      <span class="live"><i />ADAPTIVE · FLIP 0.6S</span>
    </div>

    <div class="bento">
      <!-- ═══ MI DOCKET — the monument ═══ -->
      <div :ref="(el) => setTile('docket', el)" v-bind="tileAttrs('docket')">
        <div class="tin"><span class="sweep" />
          <div class="tt sd-mono"><Flag class="ic" />MI DOCKET · RULE REQUIRED<span class="sp" />
            <button class="badge" :class="{ calm: !docketCount }" @click="$emit('lens', 'mi_proposed')">
              {{ docketCount ? `${docketCount} CANDIDATE${docketCount > 1 ? 'S' : ''}` : 'CLEAR' }}</button></div>

          <template v-if="docketRow && rankOf('docket') === 0">
            <div class="dk-full">
              <div class="dk-cand">
                <span class="dk-id sd-mono">{{ docketRow.ticket_number }}</span>
                <span class="dk-sev sd-mono">SEV{{ docketRow.sev }}</span>
                <span class="dk-hold sd-mono">HOLDING</span>
              </div>
              <div class="dk-sub">{{ docketRow.subject }} — proposed for major-incident status.</div>
              <div v-if="docketRow.mi_proposal_note" class="dk-note">“{{ docketRow.mi_proposal_note }}”</div>
              <div class="dk-meta sd-mono">
                <span class="avatar sd-mono">{{ initials(docketRow.mi_proposed_by_name) }}</span>
                <span>PROPOSED BY <b>{{ (docketRow.mi_proposed_by_name || 'AGENT').toUpperCase() }}</b>
                  · <b>{{ mmss(secSince(docketRow.mi_proposed_at)) }}</b> ELAPSED{{ dkExposure }}</span>
              </div>

              <!-- readonly response readiness (playbook meter — check-offs stay with agents) -->
              <div v-if="docketRow.task_total" class="dk-pbk">
                <SdIncPlaybook :ticket="docketRow" readonly />
              </div>

              <!-- keys → arm (cadence + war room) → confirm · decline is reason-gated -->
              <div v-if="dkView === 'keys'" class="dk-keys">
                <template v-if="capsReady && canRule(docketRow)">
                  <button class="key gold" :disabled="dkBusy" @click="dkView = 'arm'">
                    <Check class="ic" />CONFIRM MI</button>
                  <button class="key ghost" :disabled="dkBusy" @click="dkView = 'decline'">
                    <X class="ic" />DECLINE</button>
                </template>
                <span v-else class="dk-gate sd-mono">RULING IS LEAD / ADMIN AUTHORITY — THIS VIEW IS READ-ONLY.</span>
              </div>
              <div v-else-if="dkView === 'arm'" class="dk-arm">
                <div class="seg">
                  <span class="lbl sd-mono">UPDATE CADENCE</span>
                  <button v-for="c in [15, 30, 60]" :key="c" class="sd-mono" :class="{ sel: dkCadence === c }"
                    @click="dkCadence = c">{{ c }}M</button>
                  <button class="sd-mono war" :class="{ sel: dkWar }" @click="dkWar = !dkWar">
                    <Radio class="ic" />WAR ROOM {{ dkWar ? 'ON' : 'OFF' }}</button>
                </div>
                <div class="dk-armrow">
                  <button class="key gold grow" :disabled="dkBusy" @click="fireConfirm">
                    <Radio class="ic" />ARM &amp; CONFIRM MI</button>
                  <button class="key ghost" :disabled="dkBusy" @click="dkView = 'keys'">BACK</button>
                </div>
              </div>
              <div v-else class="dk-arm">
                <div class="dk-declreasons">
                  <span class="lbl sd-mono">REASON (GATED)</span>
                  <button v-for="r in DECLINE_REASONS" :key="r" class="rchip sd-mono"
                    :class="{ sel: dkReason === r }" @click="dkReason = r">{{ r }}</button>
                </div>
                <input v-model="dkDetail" class="dk-detail" type="text" maxlength="400"
                  placeholder="Add detail for the proposer (optional)…" />
                <div class="dk-armrow">
                  <button class="key decline grow" :disabled="!dkReason || dkBusy" @click="fireDecline">
                    CONFIRM DECLINE</button>
                  <button class="key ghost" :disabled="dkBusy" @click="dkView = 'keys'">BACK</button>
                </div>
              </div>
            </div>
          </template>
          <div v-else class="dk-mini sd-mono">
            <template v-if="docketRow">{{ docketRow.ticket_number }} HOLDING · EXPAND ON NEXT RE-WEIGH</template>
            <template v-else-if="lastRuling">DOCKET CLEAR · {{ lastRuling }}</template>
            <template v-else>DOCKET CLEAR · NEXT CANDIDATE WILL RE-CLAIM THE MONUMENT ·
              {{ mi30d }} RULINGS / 30D</template>
          </div>
        </div>
      </div>

      <!-- ═══ UPDATE OVERDUE ═══ -->
      <div :ref="(el) => setTile('overdue', el)" v-bind="tileAttrs('overdue')">
        <div class="tin"><span class="sweep" />
          <div class="tt sd-mono"><Clock class="ic" />UPDATE OVERDUE<span class="sp" />
            <button class="badge" :class="overdueRow ? 'esc' : 'calm'" @click="$emit('lens', 'update_overdue')">
              {{ overdueRow ? overdueRow.ticket_number : overdueCount || 'NONE' }}</button></div>
          <template v-if="overdueRow">
            <div class="uv"><span class="big warn pulse-count sd-mono">+{{ mmss(secSince(overdueRow.next_update_due_at)) }}</span>
              <span class="usub">PAST {{ overdueRow.update_interval_minutes || '—' }}M<br />CADENCE</span></div>
            <div class="usub">SEV{{ overdueRow.sev }} · {{ upper(overdueRow.subject) }} · OWNER
              <b>{{ upper(overdueRow.assigned_agent_name || 'UNOWNED') }}</b>
              <template v-if="overdueRow.sla_paused_since"> · SLA PAUSED — THE COMMS CLOCK ISN'T.</template></div>
            <div class="usub only-lg">STAKEHOLDER CHANNEL LAST FED
              {{ overdueRow.last_status_update_at ? minLabel(minSince(overdueRow.last_status_update_at)) + ' AGO' : 'NEVER' }}
              · THE AUDIENCE IS WAITING.</div>
            <div class="ukeys">
              <template v-if="capsReady && canGovern">
                <button v-if="overdueRow.assigned_agent_id && !isNudged(overdueRow)" class="key gold" :disabled="busy(overdueRow)"
                  @click="$emit('nudge', overdueRow)"><BellRing class="ic" />NUDGE OWNER</button>
                <span v-else-if="overdueRow.assigned_agent_id" class="tstamp sd-mono"><Check class="ic" />NUDGED · THROTTLED 24H</span>
              </template>
              <button class="key ghost" @click="$emit('open', overdueRow.id)">DRAFT UPDATE</button>
            </div>
          </template>
          <template v-else>
            <div class="uv"><span class="big ok sd-mono">0</span><span class="usub">CHANNELS<br />SILENT</span></div>
            <div class="usub">EVERY ARMED CADENCE IS ON PROMISE — NO STAKEHOLDER CHANNEL RUNNING SILENT.</div>
          </template>
        </div>
      </div>

      <!-- ═══ COMMANDER UNSTAFFED ═══ -->
      <div :ref="(el) => setTile('cmdr', el)" v-bind="tileAttrs('cmdr')">
        <div class="tin"><span class="sweep" />
          <div class="tt sd-mono"><Users class="ic" />COMMANDER UNSTAFFED<span class="sp" />
            <button class="badge" :class="cmdrRow ? 'esc' : 'calm'" @click="$emit('lens', 'cmdr_unstaffed')">
              {{ cmdrRow ? cmdrRow.ticket_number : cmdrCount || 'NONE' }}</button></div>
          <template v-if="cmdrRow">
            <div class="usub">A SEV1 IS RUNNING WITHOUT A CMDR. SUGGESTED LEADS BY LOAD:</div>
            <div class="leads">
              <div v-for="p in cmdrPool" :key="String(p.id)" class="lead">
                <span class="avatar sd-mono">{{ initials(p.name) }}</span>
                <span><span class="nm sd-mono">{{ upper(p.name) }}</span><br />
                  <span class="ld sd-mono" :class="{ hot: (p.command_load || 0) >= 2 }">
                    {{ p.command_load ? `CMDR ON ${p.command_load} LIVE · LOAD ${p.command_load >= 2 ? 'HOT' : 'WARM'}` : (p.is_lead ? 'LEAD · LIGHT' : 'LIGHT') }}</span></span>
                <button v-if="capsReady && canGovern" class="staffk sd-mono"
                  @click="$emit('roster', cmdrRow)">STAFF</button>
              </div>
              <div v-if="!cmdrPool.length" class="usub dim">STAFFING POOL LOADING — OPEN THE ROSTER TO SEAT A COMMANDER.</div>
            </div>
            <button v-if="capsReady && canGovern" class="key ghost mt-auto" @click="$emit('roster', cmdrRow)">
              <Crown class="ic" />OPEN THE ROSTER</button>
          </template>
          <template v-else>
            <div class="uv"><span class="big ok sd-mono">{{ sev1Count }}</span><span class="usub">SEV1<br />STAFFED</span></div>
            <div class="usub">EVERY LIVE SEV1 HAS A COMMANDER SEATED. ROSTER CHANGES STAY AUDITED.</div>
          </template>
        </div>
      </div>

      <!-- ═══ SLA BREACHED ═══ -->
      <div :ref="(el) => setTile('breach', el)" v-bind="tileAttrs('breach')">
        <div class="tin" :class="{ red: breachRow }"><span class="sweep" />
          <div class="tt sd-mono"><TriangleAlert class="ic" :class="{ esc: breachRow }" />SLA BREACHED<span class="sp" />
            <button class="badge" :class="breachRow ? 'esc' : 'calm'" @click="$emit('lens', 'breached')">
              {{ breachRow ? breachRow.ticket_number : breachCount || 'NONE' }}</button></div>
          <template v-if="breachRow">
            <div class="uv"><span class="big esc sd-mono">+{{ hms(breachDebtSec) }}</span>
              <span class="usub">TIME DEBT<br />ACCRUING</span></div>
            <div class="usub">SEV{{ breachRow.sev }} · {{ upper(breachRow.subject) }} · OWNER
              <b>{{ upper(breachRow.assigned_agent_name || 'UNOWNED') }}</b>
              <template v-if="breachRow.task_total"> · PLAYBOOK {{ breachRow.task_done }}/{{ breachRow.task_total }}{{ breachRow.task_done === breachRow.task_total ? ' ✓' : '' }}</template>
              <template v-if="breachRow.parent_incident_number"> · CHILD OF {{ breachRow.parent_incident_number }}</template>
              <template v-if="breachRow.affected_users != null"> · <b>{{ fmtNum(breachRow.affected_users) }}</b> USERS</template></div>
            <div class="usub only-lg">THE DEBT COMPOUNDS UNTIL RESOLUTION LANDS — ESCALATE A TIER OR
              RECLASSIFY WITH A RECORDED REASON.</div>
            <div class="ukeys">
              <template v-if="capsReady && canGovern">
                <button class="key redk" :disabled="busy(breachRow)" @click="$emit('escalate', breachRow)">
                  <ChevronsUp class="ic" />ESCALATE</button>
                <button v-if="canRule(breachRow) && breachRow.sev === 2" class="key ghost" :disabled="busy(breachRow)"
                  title="SEV2 → SEV3 requires a recorded reason"
                  @click="$emit('reclassify', { row: breachRow, direction: 'de_escalate' })">
                  <ArrowUpDown class="ic" />RECLASSIFY</button>
              </template>
              <button class="key ghost" @click="$emit('open', breachRow.id)">OPEN</button>
            </div>
          </template>
          <template v-else>
            <div class="uv"><span class="big ok sd-mono">0</span><span class="usub">BREACHES<br />ON THE LENS</span></div>
            <div class="usub">NO SLA DEBT ACCRUING ON THE CRITICAL LENS. THE AT-RISK RAIL IS THE EARLY WARNING.</div>
          </template>
        </div>
      </div>

      <!-- ═══ EXPOSURE ROLLUP ═══ -->
      <div :ref="(el) => setTile('exposure', el)" v-bind="tileAttrs('exposure')">
        <div class="tin"><span class="sweep" />
          <div class="tt sd-mono"><Shield class="ic" />EXPOSURE ROLLUP<span class="sp" />
            <span class="badge calm">FILTERS</span></div>
          <div class="dials">
            <button v-for="d in dials" :key="d.key" class="dial" :class="{ on: activeLens === d.key }"
              :title="`Filter board · ${d.label}`" @click="$emit('lens', d.key)">
              <span class="ring" :style="{ '--p': d.pct }"><b class="sd-mono">{{ d.n }}</b></span>
              <label class="sd-mono">{{ d.label }}</label>
            </button>
          </div>
          <div class="exp-extra">
            <span class="users sd-mono"><b>{{ fmtNum(blastUsers) }}</b> AFFECTED USERS</span>
            <button class="debt sd-mono" :class="{ on: activeLens === 'unassessed' }"
              @click="$emit('lens', 'unassessed')">UNASSESSED · {{ unassessedN }}</button>
          </div>
        </div>
      </div>

      <!-- ═══ RESPONDER LOAD ═══ -->
      <div :ref="(el) => setTile('load', el)" v-bind="tileAttrs('load')">
        <div class="tin"><span class="sweep" />
          <div class="tt sd-mono"><Gauge class="ic" />RESPONDER LOAD<span class="sp" />
            <span class="badge calm">{{ respLoad.length }} ON SHIFT</span></div>
          <div v-if="respLoad.length" class="resp">
            <div v-for="p in respLoad" :key="String(p.user_id)" class="rrow sd-mono" :class="{ hot: p.hot }">
              <span class="nm">{{ upper(p.name || '—') }}</span>
              <span class="rbar"><i v-for="(c, i) in p.cells" :key="i" :class="c" /></span>
              <span class="ct">{{ p.sev1 }}/{{ p.sev2 }}/{{ p.unacked }}</span>
              <span v-if="p.hot" class="hotflag sd-mono">HOT</span>
            </div>
          </div>
          <div v-else class="usub">NO RESPONDERS CARRYING LIVE SEV1∪SEV2 — THE DESK IS QUIET.</div>
        </div>
      </div>

      <!-- ═══ PIR SIGN-OFF ═══ -->
      <div :ref="(el) => setTile('pir', el)" v-bind="tileAttrs('pir')">
        <div class="tin"><span class="sweep" />
          <div class="tt sd-mono"><FileText class="ic" />PIR SIGN-OFF<span class="sp" />
            <span class="badge" :class="folios.length ? '' : 'calm'">{{ folios.length }} FOLIO{{ folios.length === 1 ? '' : 'S' }}</span></div>
          <div v-if="folios.length" class="pir-list">
            <div v-for="p in folios" :key="String(p.id)" class="pir-row">
              <span><span class="pid sd-mono">{{ p.report_number }}</span><br />
                <span class="pmeta sd-mono">{{ p.ticket_number }} · {{ p.status === 'approved' ? 'APPROVED' : `IN REVIEW ${p.updated_at || p.created_at ? minLabel(minSince(p.updated_at || p.created_at)) : ''}` }}</span></span>
              <span class="grp">
                <template v-if="capsReady && canGovern">
                  <template v-if="p.status === 'in_review'">
                    <button class="mk sd-mono" @click="$emit('pir-sign', { pir: p, mode: 'approve' })">APPROVE</button>
                    <button class="mk rej sd-mono" @click="$emit('pir-sign', { pir: p, mode: 'reject' })">REJECT</button>
                  </template>
                  <button v-else class="mk pub sd-mono" :disabled="!canPublish"
                    :title="canPublish ? 'Publish to the knowledge record' : 'Publishing is an admin action'"
                    @click="$emit('pir-publish', p)">PUBLISH ▸</button>
                </template>
              </span>
            </div>
          </div>
          <div v-else class="usub">NO FOLIOS AWAITING SIGN-OFF — THE RECORD IS CURRENT.</div>
        </div>
      </div>

      <!-- ═══ ACK COVERAGE ═══ -->
      <div :ref="(el) => setTile('ack', el)" v-bind="tileAttrs('ack')">
        <div class="tin"><span class="sweep" />
          <div class="tt sd-mono"><Check class="ic" />ACK COVERAGE</div>
          <div class="ackwrap">
            <span class="ackring" :style="{ '--p': ackPct }"><b class="sd-mono">{{ ackPct }}%</b></span>
            <span class="acknote sd-mono"><b>{{ unackedN }} UNACKED</b> · OWNERS PAGED.<br />
              ACKING STAYS WITH AGENTS —<br />ADMIN ACKS POISON MTTA.</span>
          </div>
        </div>
      </div>

      <!-- ═══ CADENCE HEALTH ═══ -->
      <div :ref="(el) => setTile('cadence', el)" v-bind="tileAttrs('cadence')">
        <div class="tin"><span class="sweep" />
          <div class="tt sd-mono"><Clock class="ic" />CADENCE HEALTH</div>
          <div v-if="cadenceList.length" class="cadl">
            <div v-for="c in cadenceList" :key="String(c.id)" class="cadr sd-mono" :class="c.cls">
              <button class="cid" :title="c.subject" @click="$emit('open', c.id)">{{ c.short }}</button>
              <span class="clbl">{{ c.lbl }}</span>
              <span class="cv">{{ c.val }}</span>
            </div>
          </div>
          <div v-else class="usub">NO UPDATE CADENCES ARMED — CADENCE ARMS ON MI CONFIRM OR VIA THE DRAWER.</div>
        </div>
      </div>

      <!-- ═══ SIMILAR INTEL ═══ -->
      <div :ref="(el) => setTile('intel', el)" v-bind="tileAttrs('intel')">
        <div class="tin"><span class="sweep" />
          <div class="tt sd-mono"><Target class="ic" />SIMILAR INTEL</div>
          <template v-if="intelTop">
            <span class="intel-chip sd-mono" :class="{ hotc: intelRepeat }">
              <TriangleAlert class="ic" />{{ intelRepeat ? `REPEAT ×${intelItems.length} / 180D` : `PRECEDENT ×${intelItems.length}` }}</span>
            <div class="intel-b">Last similar: <b>{{ intelTop.ticket_number }}</b>
              <template v-if="intelTop.resolved_at">, resolved {{ minLabel(minSince(intelTop.resolved_at)) }} ago</template>
              — <b>“{{ intelTop.subject }}”</b>. Fingerprint matches {{ intel?.base?.ticket_number }}.</div>
            <button class="ilink sd-mono mt-auto" @click="$emit('open', intelTop.id)">
              OPEN {{ intelTop.ticket_number }}<ArrowUpRight class="ic" /></button>
          </template>
          <div v-else class="intel-b dim">No terminal precedent shares this fault line —
            {{ intel?.base?.ticket_number || 'the lead fault' }} is breaking new ground.</div>
        </div>
      </div>

      <!-- ═══ RECENTLY LANDED (the shelf) ═══ -->
      <div :ref="(el) => setTile('landed', el)" v-bind="tileAttrs('landed')">
        <div class="tin"><span class="sweep" />
          <div class="tt sd-mono"><Inbox class="ic" />RECENTLY LANDED · LAST 7 DAYS<span class="sp" />
            <span class="badge calm">PIR LEDGER</span></div>
          <div v-if="landed7.length" class="shelf">
            <button v-for="it in landed7.slice(0, 4)" :key="String(it.id)" class="shelf-it sd-mono"
              @click="$emit('open', it.id)">
              <span class="sid">{{ it.ticket_number }}</span>
              <span class="sv">S{{ it.sev }}</span>
              <span class="pirtag" :class="pirTagCls(it)">{{ pirTag(it) }}</span>
              <span class="mt">MTTR {{ mttrOf(it) }}</span>
            </button>
          </div>
          <div v-else class="usub">NOTHING HAS LANDED IN THE WINDOW — THE SHELF FILLS AS FAULTS RESOLVE.</div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
/*
  The FLIP engine (artifact-exact): weight → rank → span tier. TIERS[0] is the
  monument (7×4), then urgent 5×2 ×2, elevated 4×2 ×3, calm 3×2 ×4, and the
  full-width shelf. Weights derive from REAL data (rows window + stats selectors +
  PIR folios); ranks only change when the ORDER changes, so the 1s clock never
  thrashes the grid — the 60s poll (or a verb landing) is what re-seats the room.
  Direct stats.critical reads are collected in ONE `crit` computed below (chip
  counts still route through the CRIT/EXPOSURE selectors).
*/
import { ref, reactive, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import {
  Flag, Check, X, Radio, Clock, BellRing, Users, Crown, TriangleAlert, ChevronsUp,
  ArrowUpDown, Shield, Gauge, FileText, Target, Inbox, ArrowUpRight,
} from 'lucide-vue-next'
import SdIncPlaybook from './SdIncPlaybook.vue'
import { CRIT_LENSES, EXPOSURE_LENSES } from '../composables/useCriticalDesk'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  stats: { type: Object, default: null },
  now: { type: Number, default: () => Date.now() },
  reduced: { type: Boolean, default: false },
  busyId: { type: [String, Number], default: null },
  pirs: { type: Array, default: () => [] },          // in_review folios
  pirsApproved: { type: Array, default: () => [] },  // approved, awaiting publish
  landed: { type: Array, default: () => [] },        // terminal shelf rows
  cmdrPool: { type: Array, default: () => [] },      // suggested leads for the unstaffed SEV1
  intel: { type: Object, default: null },            // { base, items } from useIncidentPeek
  nudgedIds: { type: Array, default: () => [] },
  lastRuling: { type: String, default: '' },
  capsReady: { type: Boolean, default: false },
  canGovern: { type: Boolean, default: false },
  // PIR publish is superuser-only on the backend — gate the verb to match (fail-closed).
  canPublish: { type: Boolean, default: false },
  canRule: { type: Function, default: () => false },
  activeLens: { type: String, default: null },
})
const emit = defineEmits([
  'confirm-mi', 'decline-mi', 'nudge', 'open', 'roster', 'escalate', 'reclassify',
  'pir-sign', 'pir-publish', 'lens',
])

/* ── helpers (declare before any computed — TDZ) ── */
const pad = (n) => String(n).padStart(2, '0')
const mmss = (s) => { s = Math.max(0, s | 0); return `${pad((s / 60) | 0)}:${pad(s % 60)}` }
const hms = (s) => { s = Math.max(0, s | 0); return `${(s / 3600) | 0}:${pad(((s % 3600) / 60) | 0)}:${pad(s % 60)}` }
const secSince = (ts) => (ts ? Math.max(0, Math.floor((props.now - new Date(ts).getTime()) / 1000)) : 0)
const minSince = (ts) => Math.floor(secSince(ts) / 60)
const minLabel = (m) => (m == null ? '—' : m >= 1440 ? `${Math.floor(m / 1440)}d` : m >= 60 ? `${Math.floor(m / 60)}h${pad(m % 60)}m` : `${m}m`)
const fmtNum = (n) => (n == null ? '—' : Number(n).toLocaleString('en-US'))
const upper = (s) => String(s || '').toUpperCase()
const initials = (n) => String(n || '?').split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
const TERMINAL = new Set(['resolved', 'closed', 'archived'])
const liveRow = (r) => !TERMINAL.has(String(r.status || '')) && !r.merged_into_id
const busy = (r) => props.busyId != null && String(props.busyId) === String(r?.id)
const isNudged = (r) => props.nudgedIds.some((id) => String(id) === String(r?.id))
const statOf = (key) => {
  const def = CRIT_LENSES[key] || EXPOSURE_LENSES[key]
  return def ? def.stat(props.stats || {}) : 0
}

/* ── the ONE direct stats.critical read (everything else = selectors) ── */
const crit = computed(() => props.stats?.critical || {})

/* ── tile exemplars from the live window ── */
const docketRow = computed(() => props.rows.find((r) => r.mi_proposed_at && !r.is_major_incident && liveRow(r)) || null)
const overdueRow = computed(() => {
  const c = props.rows.filter((r) => liveRow(r) && r.next_update_due_at
    && new Date(r.next_update_due_at).getTime() < props.now)
  return c.sort((a, b) => new Date(a.next_update_due_at) - new Date(b.next_update_due_at))[0] || null
})
const cmdrRow = computed(() => props.rows.find((r) => liveRow(r) && r.sev === 1 && !r.incident_commander_id) || null)
const breachRow = computed(() => {
  const c = props.rows.filter((r) => liveRow(r) && (r.sla_resolution_breached || r.sla_response_breached))
  return c.sort((a, b) => new Date(a.resolution_due_at || a.response_due_at || a.created_at)
    - new Date(b.resolution_due_at || b.response_due_at || b.created_at))[0] || null
})
const breachDebtSec = computed(() => {
  const r = breachRow.value
  if (!r) return 0
  return secSince(r.sla_resolution_breached ? (r.resolution_due_at || r.created_at) : (r.response_due_at || r.created_at))
})
const docketCount = computed(() => statOf('mi_proposed'))
const overdueCount = computed(() => statOf('update_overdue'))
const cmdrCount = computed(() => statOf('cmdr_unstaffed'))
const breachCount = computed(() => statOf('breached'))
const sev1Count = computed(() => statOf('sev1'))
const unackedN = computed(() => statOf('unacked'))
const unassessedN = computed(() => statOf('unassessed'))
const mi30d = computed(() => (crit.value.mi_confirmed_30d ?? 0) + (crit.value.mi_declined_30d ?? 0))
const dkExposure = computed(() => {
  const r = docketRow.value
  if (!r) return ''
  const tags = []
  if (r.compliance_impact) tags.push('COMPLIANCE')
  if (r.security_impact) tags.push('SECURITY')
  if (r.public_impact) tags.push('PUBLIC')
  const t = tags.length ? ` · ${tags.join(' + ')}` : ''
  return r.affected_users != null ? `${t} · ${fmtNum(r.affected_users)} USERS` : t
})

/* exposure dials — selector counts over the live desk total */
const dials = computed(() => {
  const total = Math.max(1, statOf('sev1') + statOf('sev2'))
  return [
    { key: 'exposure_revenue', label: 'REVENUE', n: statOf('exposure_revenue') },
    { key: 'exposure_compliance', label: 'COMPLIANCE', n: statOf('exposure_compliance') },
    { key: 'exposure_security', label: 'SECURITY', n: statOf('exposure_security') },
    { key: 'exposure_public', label: 'PUBLIC', n: statOf('exposure_public') },
  ].map((d) => ({ ...d, pct: Math.min(100, Math.round((d.n / total) * 100)) }))
})
const blastUsers = computed(() => props.rows.reduce((s, r) => s + (Number(r.affected_users) || 0), 0))

/* responder load — 5 heaviest carriers, weighted cells like the artifact bars */
const respLoad = computed(() => {
  const list = [...(crit.value.responder_load || [])]
  list.sort((a, b) => (b.sev1 * 3 + b.sev2 + b.unacked) - (a.sev1 * 3 + a.sev2 + a.unacked))
  const top = list.slice(0, 5)
  const max = Math.max(1, ...top.map((p) => p.sev1 + p.sev2 + p.unacked))
  return top.map((p, i) => {
    const cells = []
    for (let k = 0; k < p.sev1; k++) cells.push('s1')
    for (let k = 0; k < p.sev2; k++) cells.push('s2')
    for (let k = 0; k < p.unacked; k++) cells.push('un')
    while (cells.length < Math.max(5, max)) cells.push('')
    return { ...p, cells: cells.slice(0, Math.max(5, max)), hot: i === 0 && (p.sev1 + p.sev2 + p.unacked) >= 3 }
  })
})

/* ack ring */
const ackPct = computed(() => Math.round(crit.value.ack_coverage_pct ?? 100))

/* PIR folios — in_review first, then approved-awaiting-publish */
const folios = computed(() => [...props.pirs, ...props.pirsApproved].slice(0, 4))

/* cadence health — armed cadences on the window, overdue first */
const cadenceList = computed(() => props.rows
  .filter((r) => liveRow(r) && r.update_interval_minutes)
  .map((r) => {
    const over = r.next_update_due_at && new Date(r.next_update_due_at).getTime() < props.now
    /* artifact: only the holding MI candidate's on-track cadence reads ON-PROMISE (green) */
    const promise = !over && docketRow.value && String(r.id) === String(docketRow.value.id)
    return {
      id: r.id,
      subject: r.subject,
      short: String(r.ticket_number || '').slice(-6),
      lbl: `${r.update_interval_minutes}M${promise ? ' · ON-PROMISE' : ''}`,
      val: over ? `+${mmss(secSince(r.next_update_due_at))}` : (r.next_update_due_at ? mmss(Math.max(0, Math.floor((new Date(r.next_update_due_at).getTime() - props.now) / 1000))) : '—'),
      cls: over ? 'over' : (promise ? 'okp' : ''),
      overSort: over ? 0 : 1,
    }
  })
  .sort((a, b) => a.overSort - b.overSort)
  .slice(0, 5))

/* similar intel */
const intelItems = computed(() => (Array.isArray(props.intel?.items) ? props.intel.items : []))
const intelTop = computed(() => intelItems.value[0] || null)
const intelRepeat = computed(() => intelItems.value.filter((s) => (s?.score ?? 0) >= 3).length >= 2)

/* landed shelf — the artifact's 7-day window, filtered off the newest-resolved fetch */
const landed7 = computed(() => props.landed.filter((it) => {
  const end = it.resolved_at || it.closed_at
  return end && (props.now - new Date(end).getTime()) <= 7 * 86400000
}))
const pirTag = (it) => (it.pir_status === 'approved' || it.pir_status === 'published' ? 'APPROVED'
  : it.has_pir ? 'FILED' : 'PIR OWED')
const pirTagCls = (it) => (it.pir_status === 'approved' || it.pir_status === 'published' ? 'appr'
  : it.has_pir ? 'filed' : 'owed')
const mttrOf = (it) => {
  const end = it.resolved_at || it.closed_at
  if (!end) return '—'
  const start = it.incident_detected_at || it.created_at
  const m = Math.max(0, Math.round((new Date(end) - new Date(start)) / 60000))
  return `${Math.floor(m / 60)}:${pad(m % 60)}`
}

/* ── docket interaction state ── */
const DECLINE_REASONS = ['DUPLICATE', 'BLAST INSUFFICIENT', 'HANDLED IN-LANE']
const dkView = ref('keys')
const dkCadence = ref(30)
const dkWar = ref(true)
const dkReason = ref('')
const dkDetail = ref('')
const dkBusy = computed(() => busy(docketRow.value))
watch(() => docketRow.value?.id, () => {
  dkView.value = 'keys'; dkCadence.value = 30; dkWar.value = true; dkReason.value = ''; dkDetail.value = ''
})
const fireConfirm = () => {
  if (!docketRow.value) return
  emit('confirm-mi', { row: docketRow.value, cadence: dkCadence.value, warRoom: dkWar.value })
}
const fireDecline = () => {
  if (!docketRow.value || !dkReason.value) return
  const note = dkDetail.value.trim() ? `${dkReason.value} — ${dkDetail.value.trim()}` : dkReason.value
  emit('decline-mi', { row: docketRow.value, note })
}

/* ═══════════ THE ADAPTIVE BENTO — weight → rank → span, FLIP re-flow ═══════════ */
const TILE_IDS = ['docket', 'overdue', 'cmdr', 'breach', 'exposure', 'load', 'pir', 'ack', 'cadence', 'intel', 'landed']
const TIERS = [
  ['sp-c7', 'sp-r4'],   /* 0 · the monument */
  ['sp-c5', 'sp-r2'], ['sp-c5', 'sp-r2'],                       /* urgent */
  ['sp-c4', 'sp-r2'], ['sp-c4', 'sp-r2'], ['sp-c4', 'sp-r2'],   /* elevated */
  ['sp-c3', 'sp-r2'], ['sp-c3', 'sp-r2'], ['sp-c3', 'sp-r2'], ['sp-c3', 'sp-r2'],  /* calm */
  ['sp-c12', 'sp-r2'],  /* 10 · the shelf */
]
const weights = computed(() => {
  const w = {}
  w.docket = docketRow.value ? 100 : 24
  w.overdue = overdueRow.value
    ? Math.min(84, (isNudged(overdueRow.value) ? 42 : 62) + Math.min(20, minSince(overdueRow.value.next_update_due_at)))
    : 8
  w.cmdr = cmdrRow.value ? 58 : 15
  w.breach = breachRow.value ? (breachDebtSec.value >= 45 * 60 ? 76 : 52) : 7
  w.exposure = 30
  w.load = respLoad.value.length ? 26 : 9
  /* pir stays FLAT 23 (artifact weight table) so exposure(30)/load(26) hold row 2 */
  w.pir = folios.value.length ? 23 : 10
  w.ack = 20
  w.cadence = 18
  w.intel = intelRepeat.value ? 21 : 12
  w.landed = 6
  return w
})
const rankedIds = (w) => [...TILE_IDS].sort((a, b) => w[b] - w[a])
const ranks = reactive({})
rankedIds(weights.value).forEach((id, i) => { ranks[id] = i })
const flash = reactive({})
const tileEls = {}
const reweighAt = ref(Date.now())
const flashTimers = []
let booted = false

const setTile = (id, el) => { tileEls[id] = el }
const rankOf = (id) => ranks[id] ?? TILE_IDS.indexOf(id)
const tileAttrs = (id) => {
  const r = rankOf(id)
  const [c, rr] = TIERS[Math.min(r, TIERS.length - 1)]
  return {
    class: ['tile', c, rr, flash[id] || ''],
    'data-rank': r,
    style: { order: r, animationDelay: `${(0.12 + r * 0.05).toFixed(2)}s` },
  }
}
const rankSig = computed(() => rankedIds(weights.value).join('|'))

function layout (animate) {
  const order = rankedIds(weights.value)
  const rects = new Map()
  if (animate && !props.reduced) {
    order.forEach((id) => { const el = tileEls[id]; if (el) rects.set(id, el.getBoundingClientRect()) })
  }
  const prev = { ...ranks }
  order.forEach((id, i) => { ranks[id] = i })
  order.forEach((id, i) => {
    if (animate && prev[id] != null && prev[id] !== i) {
      flash[id] = i < prev[id] ? 'promoted' : 'demoted'
      flashTimers.push(setTimeout(() => { flash[id] = '' }, 1600))
    }
  })
  reweighAt.value = Date.now()
  if (!animate || props.reduced) return
  /* FLIP: measure → invert → play (0.6s, house ease) */
  nextTick(() => {
    order.forEach((id) => {
      const el = tileEls[id]
      const a = rects.get(id)
      if (!el || !a) return
      const b = el.getBoundingClientRect()
      if (!b.width || !b.height) return
      const dx = a.left - b.left
      const dy = a.top - b.top
      const sx = a.width / b.width
      const sy = a.height / b.height
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) return
      el.style.transition = 'none'
      el.style.transformOrigin = 'top left'
      el.style.zIndex = '3'
      el.style.transform = `translate(${dx}px,${dy}px) scale(${sx},${sy})`
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
        el.style.transform = ''
        setTimeout(() => { el.style.zIndex = ''; el.style.transition = '' }, 650)
      }))
    })
  })
}
watch(rankSig, () => { if (booted) layout(true) })
onMounted(() => { layout(false); booted = true })
onBeforeUnmount(() => { flashTimers.forEach(clearTimeout) })

const reweighClock = computed(() => new Date(reweighAt.value).toLocaleTimeString([],
  { hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit' }))
</script>

<style scoped>
/* ═══ THE OBSIDIAN STAGE — dark in BOTH themes (house display-panel rule).
   Warm-glass tile literals are seated ON the wall, so they stay literal. ═══ */
.stage { position: relative; border-radius: 24px; padding: 20px 20px 22px; color: var(--sd-fun-wall-ink);
  border: 1px solid color-mix(in srgb, var(--sd-fun-core) 15%, transparent);
  background:
    repeating-linear-gradient(90deg, transparent 0 118px, var(--sd-fun-wall-line) 118px 119px),
    radial-gradient(1000px 360px at 50% -80px, color-mix(in srgb, var(--sd-fun-core) 6%, transparent), transparent 70%),
    var(--sd-fun-wall);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(244, 227, 203, 0.05); }
.stage-top { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 16px;
  padding: 0 4px; font-size: 9px; font-weight: 600; letter-spacing: 0.3em; color: var(--sd-fun-wall-dim); }
.stage-top .sp { flex: 1; }
/* the reweigh stamp is the artifact's emerald pill — a system heartbeat, not plain text */
.stage-top .stamp { display: inline-flex; align-items: center; color: var(--sd-fun-resolved);
  letter-spacing: 0.18em; font-size: 11px; line-height: 1.5; font-variant-numeric: tabular-nums;
  border: 1px solid rgba(52, 211, 153, 0.35); border-radius: 11px; padding: 12px 16px;
  background: rgba(52, 211, 153, 0.07); }
.stage-top .live { display: inline-flex; align-items: center; gap: 7px; color: var(--sd-fun-resolved);
  letter-spacing: 0.2em; }
.stage-top .live i { width: 6px; height: 6px; border-radius: 50%; background: var(--sd-fun-resolved);
  box-shadow: 0 0 8px var(--sd-fun-resolved); animation: gb-blip 1.8s infinite; }
@keyframes gb-blip { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }

/* ── the grid ── */
.bento { display: grid; grid-template-columns: repeat(12, 1fr); grid-auto-rows: minmax(96px, auto);
  grid-auto-flow: dense; gap: 14px; }
.tile { position: relative; min-width: 0; animation: gb-rise 0.7s var(--sd-spring) both; }
@keyframes gb-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
.sp-c12 { grid-column: span 12; } .sp-c7 { grid-column: span 7; } .sp-c5 { grid-column: span 5; }
.sp-c4 { grid-column: span 4; } .sp-c3 { grid-column: span 3; }
.sp-r4 { grid-row: span 4; } .sp-r2 { grid-row: span 2; }
@media (max-width: 1240px) {
  .sp-c7 { grid-column: span 12; } .sp-c5 { grid-column: span 6; }
  .sp-c4 { grid-column: span 6; } .sp-c3 { grid-column: span 6; }
}
@media (max-width: 700px) {
  .sp-c5, .sp-c4, .sp-c3 { grid-column: span 12; }
}

/* inner glass shell — hover lift lives HERE so FLIP owns the tile transform */
.tin { position: relative; height: 100%; border-radius: 17px; overflow: hidden; padding: 16px 18px;
  display: flex; flex-direction: column; gap: 11px;
  background: linear-gradient(160deg, rgba(255, 244, 225, 0.065), rgba(255, 244, 225, 0.018));
  border: 1px solid rgba(251, 146, 60, 0.17);
  box-shadow: inset 0 1px 0 rgba(244, 227, 203, 0.11), 0 10px 30px rgba(0, 0, 0, 0.35);
  transition: transform 0.35s var(--sd-spring), border-color 0.3s, box-shadow 0.35s; }
.tile:hover .tin { transform: translateY(-3px); border-color: rgba(251, 146, 60, 0.38);
  box-shadow: inset 0 1px 0 rgba(244, 227, 203, 0.14), 0 18px 44px rgba(0, 0, 0, 0.5); }
.tin.red { border-color: rgba(240, 86, 74, 0.35); }
/* urgency spine */
.tin::before { content: ''; position: absolute; left: 0; top: 12%; bottom: 12%; width: 3px;
  border-radius: 3px; background: var(--sd-fun-auto); opacity: 0.5;
  transition: background 0.5s, opacity 0.5s, box-shadow 0.5s; }
.tile[data-rank="0"] .tin::before { background: linear-gradient(180deg, var(--sd-fun-esc), var(--sd-fun-core));
  opacity: 1; box-shadow: 0 0 12px rgba(240, 86, 74, 0.5); }
.tile[data-rank="1"] .tin::before,
.tile[data-rank="2"] .tin::before { background: var(--sd-fun-core); opacity: 1;
  box-shadow: 0 0 10px rgba(251, 146, 60, 0.4); }
.tile[data-rank="3"] .tin::before,
.tile[data-rank="4"] .tin::before,
.tile[data-rank="5"] .tin::before { background: var(--sd-fun-deep); opacity: 0.9; }
/* specular sweep */
.sweep { position: absolute; inset: -40% -60%; pointer-events: none;
  background: linear-gradient(115deg, transparent 42%, rgba(255, 244, 225, 0.075) 50%, transparent 58%);
  transform: translateX(-70%); }
.tile:hover .sweep { transition: transform 0.9s var(--sd-spring); transform: translateX(70%); }
/* promotion or demotion flash */
.tile.promoted .tin { animation: gb-promote 1.5s var(--sd-spring); }
@keyframes gb-promote {
  0% { box-shadow: inset 0 0 0 1px rgba(251, 146, 60, 0.7), 0 0 44px rgba(251, 146, 60, 0.35); }
  100% { box-shadow: inset 0 1px 0 rgba(244, 227, 203, 0.11), 0 10px 30px rgba(0, 0, 0, 0.35); }
}
.tile.demoted .tin { animation: gb-demote 1.5s var(--sd-spring); }
@keyframes gb-demote { 0% { opacity: 0.45; filter: saturate(0.5); } 100% { opacity: 1; filter: none; } }

/* engraved small-cap titles */
.tt { display: flex; align-items: center; gap: 8px; font-size: 9.5px; font-weight: 600;
  letter-spacing: 0.3em; color: var(--sd-fun-wall-dim);
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.7), 0 -0.5px 0 rgba(244, 227, 203, 0.12); }
.tt .ic { width: 12.5px; height: 12.5px; color: var(--sd-fun-core); flex: none; }
.tt .ic.esc { color: var(--sd-fun-esc); }
.tt .sp { flex: 1; }
.badge { font-family: var(--sd-mono); font-size: 9px; font-weight: 700; letter-spacing: 0.14em;
  color: #170d03; background: var(--sd-fun-grad); border: 0; border-radius: 5px; padding: 3px 7px;
  text-shadow: none; cursor: pointer; }
.badge.esc { background: linear-gradient(122deg, #ff8d7e, #f0564a); color: #210605; }
.badge.calm { background: none; border: 1px solid rgba(251, 146, 60, 0.3); color: var(--sd-fun-core); }
.ic { width: 13px; height: 13px; flex: none; }

/* mono data + shared tile bits */
.big { font-size: clamp(28px, 2.4vw, 40px); font-weight: 220; letter-spacing: -0.02em; line-height: 1;
  color: var(--sd-fun-wall-ink); font-variant-numeric: tabular-nums; }
.big.warn { color: #ffd08a; }
.big.esc { color: #ff8d7e; }
.big.ok { color: var(--sd-fun-resolved); }
.pulse-count { animation: gb-soft 1.4s infinite; }
@keyframes gb-soft { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
.uv { display: flex; align-items: baseline; gap: 14px; }
.usub { font-family: var(--sd-mono); font-size: 10px; font-weight: 500; letter-spacing: 0.12em;
  line-height: 1.7; color: var(--sd-fun-wall-dim); }
.usub b { color: var(--sd-fun-wall-ink); font-weight: 600; }
.usub.dim { opacity: 0.7; }
.only-lg { display: none; }
.tile[data-rank="0"] .only-lg, .tile[data-rank="1"] .only-lg { display: block; }
.ukeys { display: flex; gap: 9px; margin-top: auto; flex-wrap: wrap; }
.mt-auto { margin-top: auto; }
.avatar { width: 26px; height: 26px; border-radius: 50%; flex: none; display: grid; place-items: center;
  font-size: 9px; font-weight: 700; color: var(--sd-fun-wall-ink);
  background: linear-gradient(140deg, rgba(251, 146, 60, 0.35), rgba(138, 79, 22, 0.45));
  border: 1px solid rgba(251, 146, 60, 0.35); }
.key { display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  font-family: var(--sd-mono); font-size: 10.5px; font-weight: 600; letter-spacing: 0.16em;
  padding: 11px 15px; border-radius: 11px; cursor: pointer;
  border: 1px solid rgba(251, 146, 60, 0.3); color: var(--sd-fun-wall-ink);
  background: linear-gradient(160deg, rgba(255, 244, 225, 0.08), rgba(255, 244, 225, 0.02));
  box-shadow: inset 0 1px 0 rgba(244, 227, 203, 0.14);
  transition: transform 0.26s var(--sd-spring), box-shadow 0.26s, background 0.2s, color 0.2s; }
.key:hover:not(:disabled) { transform: translateY(-2px);
  box-shadow: inset 0 1px 0 rgba(244, 227, 203, 0.2), 0 8px 22px rgba(0, 0, 0, 0.45); }
.key:active:not(:disabled) { transform: translateY(1px) scale(0.98); }
.key.gold { background: var(--sd-fun-grad); color: #170d03; border-color: transparent;
  box-shadow: 0 8px 24px rgba(251, 146, 60, 0.35); }
.key.gold:hover:not(:disabled) { color: #170d03; }
.key.ghost { color: var(--sd-fun-wall-dim); }
.key.redk { color: #ff9d92; border-color: rgba(240, 86, 74, 0.35); }
.key.decline { color: #ff9d92; border-color: rgba(240, 86, 74, 0.35); }
.key.grow { flex: 1; }
.key:disabled { opacity: 0.4; cursor: not-allowed; }
.tstamp { display: inline-flex; align-items: center; gap: 8px; padding: 11px 15px; border-radius: 11px;
  font-size: 10px; font-weight: 600; letter-spacing: 0.16em; color: var(--sd-fun-resolved);
  border: 1px solid rgba(52, 211, 153, 0.35); background: rgba(52, 211, 153, 0.07); }

/* ── docket monument ── */
.dk-full { display: flex; flex-direction: column; gap: 11px; flex: 1; min-height: 0; }
.dk-cand { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.dk-id { font-size: 15px; font-weight: 700; letter-spacing: 0.06em; color: var(--sd-fun-wall-ink); }
.dk-sev { font-size: 9.5px; font-weight: 700; letter-spacing: 0.14em; color: #ffd9a8;
  border: 1px solid rgba(251, 146, 60, 0.4); border-radius: 5px; padding: 4px 7px; }
.dk-hold { font-size: 9.5px; font-weight: 700; letter-spacing: 0.14em; color: #170d03;
  background: linear-gradient(122deg, #ffd08a, #fbbf24); border-radius: 5px; padding: 4px 7px;
  animation: gb-soft 1.8s infinite; }
.dk-sub { font-size: 15px; font-weight: 350; line-height: 1.5; color: var(--sd-fun-wall-ink); }
.dk-note { border-left: 2px solid var(--sd-fun-core); border-radius: 0 10px 10px 0;
  background: rgba(255, 244, 225, 0.045); padding: 10px 14px; font-style: italic; font-weight: 350;
  font-size: 13px; line-height: 1.6; color: rgba(244, 227, 203, 0.85); }
.dk-meta { display: flex; align-items: center; gap: 10px; font-size: 9.5px; font-weight: 500;
  letter-spacing: 0.14em; color: var(--sd-fun-wall-dim); }
.dk-meta b { color: var(--sd-fun-wall-ink); }
.dk-meta.dim { font-size: 8.5px; opacity: 0.8; }
.dk-pbk { border: 1px solid rgba(251, 146, 60, 0.14); border-radius: 12px; padding: 10px 12px;
  max-height: 148px; overflow: auto; }
.dk-pbk :deep(.pbk) { --pbk-accent: var(--sd-fun-core); }
.dk-pbk :deep(.pbk-row) { background: rgba(255, 244, 225, 0.04); border-color: rgba(251, 146, 60, 0.14); }
.dk-pbk :deep(.pr-body b) { color: var(--sd-fun-wall-ink); }
.dk-keys { display: flex; gap: 12px; margin-top: auto; }
.dk-keys .key { flex: 1; padding: 15px 20px; font-size: 12px; letter-spacing: 0.2em; }
.dk-gate { font-size: 9px; letter-spacing: 0.1em; color: var(--sd-fun-esc);
  border: 1px dashed rgba(240, 86, 74, 0.4); border-radius: 9px; padding: 9px 12px; flex: 1; }
.dk-arm { display: flex; flex-direction: column; gap: 11px; margin-top: auto; }
.dk-armrow { display: flex; gap: 10px; }
.seg { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.seg .lbl { font-size: 9px; font-weight: 600; letter-spacing: 0.22em; color: var(--sd-fun-wall-dim);
  margin-right: 4px; }
.seg button { font-family: var(--sd-mono); font-size: 10.5px; font-weight: 600; letter-spacing: 0.12em;
  padding: 9px 14px; border-radius: 9px; cursor: pointer; background: none;
  border: 1px solid rgba(251, 146, 60, 0.25); color: var(--sd-fun-wall-dim); transition: all 0.2s; }
.seg button:hover { color: var(--sd-fun-wall-ink); border-color: rgba(251, 146, 60, 0.5); }
.seg button.sel { background: var(--sd-fun-grad); color: #170d03; border-color: transparent; font-weight: 700; }
.seg button.war { display: inline-flex; align-items: center; gap: 6px; }
.seg button.war .ic { width: 11px; height: 11px; }
.dk-declreasons { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.dk-declreasons .lbl { font-size: 9px; font-weight: 600; letter-spacing: 0.22em; color: var(--sd-fun-wall-dim); }
.rchip { font-size: 9.5px; font-weight: 600; letter-spacing: 0.14em; padding: 9px 12px; border-radius: 8px;
  cursor: pointer; background: none; border: 1px dashed rgba(240, 86, 74, 0.4); color: #ff9d92;
  transition: all 0.2s; }
.rchip:hover { border-style: solid; }
.rchip.sel { background: rgba(240, 86, 74, 0.15); border-style: solid; color: #ffb3aa; }
.dk-detail { width: 100%; padding: 9px 12px; border-radius: 9px; font: inherit; font-size: 11.5px;
  color: var(--sd-fun-wall-ink); background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--sd-fun-wall-line); outline: none; }
.dk-detail:focus { border-color: rgba(240, 86, 74, 0.5); }
.dk-detail::placeholder { color: var(--sd-fun-wall-dim); }
.dk-mini { font-size: 10.5px; font-weight: 500; letter-spacing: 0.12em; line-height: 1.7;
  color: var(--sd-fun-wall-dim); }

/* ── commander staffing ── */
.leads { display: flex; flex-direction: column; gap: 8px; margin-top: 2px; }
.lead { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px;
  border: 1px solid rgba(251, 146, 60, 0.14); transition: border-color 0.2s, background 0.2s; }
.lead:hover { border-color: rgba(251, 146, 60, 0.35); background: rgba(255, 244, 225, 0.03); }
.lead .nm { font-size: 10.5px; font-weight: 600; letter-spacing: 0.1em; color: var(--sd-fun-wall-ink); }
.lead .ld { font-size: 8.5px; font-weight: 500; letter-spacing: 0.12em; color: var(--sd-fun-wall-dim); }
.lead .ld.hot { color: #ffd08a; }
.staffk { margin-left: auto; font-family: var(--sd-mono); font-size: 9.5px; font-weight: 700;
  letter-spacing: 0.16em; color: var(--sd-fun-core); cursor: pointer; background: none;
  border: 1px solid rgba(251, 146, 60, 0.35); border-radius: 8px; padding: 8px 11px; transition: all 0.2s; }
.staffk:hover { background: rgba(251, 146, 60, 0.12); transform: translateY(-1px); }

/* ── responder load ── */
.resp { display: flex; flex-direction: column; gap: 8px; }
.rrow { display: flex; align-items: center; gap: 9px; font-size: 9.5px; font-weight: 600;
  letter-spacing: 0.1em; }
.rrow .nm { width: 92px; flex: none; color: var(--sd-fun-wall-ink); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; }
.rbar { flex: 1; display: flex; gap: 3px; }
.rbar i { height: 8px; border-radius: 2px; flex: 1; background: rgba(255, 244, 225, 0.08); }
.rbar i.s1 { background: var(--sd-fun-esc); }
.rbar i.s2 { background: var(--sd-fun-core); }
.rbar i.un { background: repeating-linear-gradient(45deg, #fbbf24 0 3px, transparent 3px 6px);
  border: 1px solid rgba(251, 191, 36, 0.5); }
.rrow .ct { width: 46px; text-align: right; color: var(--sd-fun-wall-dim); }
.rrow.hot .nm, .rrow.hot .ct { color: #ffd08a; }
.hotflag { font-size: 8px; font-weight: 700; letter-spacing: 0.18em; color: #170d03;
  background: linear-gradient(122deg, #ffd08a, #fbbf24); padding: 3px 6px; border-radius: 4px; }

/* ── PIR sign-off ── */
.pir-list { display: flex; flex-direction: column; gap: 10px; }
.pir-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 11px;
  border: 1px solid rgba(251, 146, 60, 0.15); }
.pir-row .pid { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; color: var(--sd-fun-wall-ink); }
.pir-row .pmeta { font-size: 8.5px; font-weight: 500; letter-spacing: 0.12em; color: var(--sd-fun-wall-dim); }
.pir-row .grp { margin-left: auto; display: flex; gap: 7px; }
.mk { font-size: 9px; font-weight: 700; letter-spacing: 0.16em; padding: 8px 11px; border-radius: 8px;
  cursor: pointer; background: none; border: 1px solid rgba(52, 211, 153, 0.35);
  color: var(--sd-fun-resolved); transition: all 0.2s; }
.mk:hover { background: rgba(52, 211, 153, 0.12); transform: translateY(-1px); }
.mk.rej { border-color: rgba(240, 86, 74, 0.35); color: #ff9d92; }
.mk.rej:hover { background: rgba(240, 86, 74, 0.1); }
.mk.pub { border-color: rgba(251, 146, 60, 0.4); color: var(--sd-fun-core); }
.mk.pub:hover:not(:disabled) { background: rgba(251, 146, 60, 0.1); }
.mk:disabled { opacity: 0.45; cursor: default; }

/* ── exposure dials ── */
.dials { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.dial { display: flex; flex-direction: column; align-items: center; gap: 7px; padding: 9px 4px;
  border-radius: 11px; cursor: pointer; background: none;
  border: 1px solid rgba(251, 146, 60, 0.14); transition: all 0.2s; }
.dial:hover { border-color: rgba(251, 146, 60, 0.4); transform: translateY(-2px); }
.dial.on { box-shadow: inset 0 0 0 1px var(--sd-fun-core); }
.debt.on { border-style: solid; background: rgba(251, 191, 36, 0.12); }
.dial .ring { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center;
  position: relative; background: conic-gradient(var(--sd-fun-core) calc(var(--p) * 1%), rgba(255, 244, 225, 0.09) 0); }
.dial .ring::before { content: ''; position: absolute; inset: 4px; border-radius: 50%; background: #0d0a10; }
.dial .ring b { position: relative; font-size: 13px; font-weight: 700; color: var(--sd-fun-wall-ink); }
.dial label { font-size: 7.5px; font-weight: 600; letter-spacing: 0.2em; color: var(--sd-fun-wall-dim);
  cursor: pointer; }
.exp-extra { display: flex; align-items: center; gap: 10px; margin-top: auto; flex-wrap: wrap; }
.exp-extra .users { font-size: 9.5px; font-weight: 600; letter-spacing: 0.12em; color: var(--sd-fun-wall-dim); }
.exp-extra .users b { color: var(--sd-fun-wall-ink); font-size: 13px; }
.debt { margin-left: auto; font-size: 8.5px; font-weight: 600; letter-spacing: 0.14em; color: #ffd08a;
  cursor: pointer; background: none; border: 1px dashed rgba(251, 191, 36, 0.45); border-radius: 8px;
  padding: 7px 9px; transition: transform 0.2s; }
.debt:hover { transform: translateY(-1px); }

/* ── ack coverage ── */
.ackwrap { display: flex; align-items: center; gap: 14px; }
.ackring { width: 64px; height: 64px; border-radius: 50%; flex: none; display: grid; place-items: center;
  position: relative;
  background: conic-gradient(var(--sd-fun-resolved) calc(var(--p) * 1%), rgba(255, 244, 225, 0.09) 0); }
.ackring::before { content: ''; position: absolute; inset: 6px; border-radius: 50%; background: #0d0a10; }
.ackring b { position: relative; font-size: 14px; font-weight: 700; color: var(--sd-fun-wall-ink); }
.acknote { font-size: 9px; font-weight: 500; letter-spacing: 0.1em; line-height: 1.7;
  color: var(--sd-fun-wall-dim); }
.acknote b { color: #ffd08a; }

/* ── cadence health ── */
.cadl { display: flex; flex-direction: column; gap: 8px; }
.cadr { display: flex; align-items: center; gap: 8px; font-size: 10px; font-weight: 600;
  letter-spacing: 0.1em; }
.cadr .cid { width: 64px; flex: none; text-align: left; padding: 0; cursor: pointer; background: none;
  border: 0; font: inherit; color: var(--sd-fun-wall-dim); }
.cadr .cid:hover { color: var(--sd-fun-core); }
.cadr .clbl { color: var(--sd-fun-wall-dim); font-weight: 500; }
.cadr .cv { margin-left: auto; color: var(--sd-fun-wall-ink); font-variant-numeric: tabular-nums; }
.cadr.over { animation: gb-soft 1.5s infinite; }
.cadr.over .cv { color: #ff8d7e; }
.cadr.okp .cv { color: var(--sd-fun-resolved); }

/* ── intel ── */
.intel-chip { display: inline-flex; align-items: center; gap: 7px; align-self: flex-start;
  font-size: 9px; font-weight: 600; letter-spacing: 0.14em; color: var(--sd-fun-core);
  border: 1px solid rgba(251, 146, 60, 0.3); border-radius: 8px; padding: 7px 9px; }
.intel-chip .ic { width: 11px; height: 11px; }
.intel-chip.hotc { color: #ffd08a; border-color: rgba(251, 191, 36, 0.45); }
.intel-b { font-size: 12px; font-weight: 350; line-height: 1.6; color: rgba(244, 227, 203, 0.85); }
.intel-b b { color: var(--sd-fun-wall-ink); font-weight: 620; }
.intel-b.dim { color: var(--sd-fun-wall-dim); }
.ilink { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start;
  font-size: 9.5px; font-weight: 600; letter-spacing: 0.16em; color: var(--sd-fun-core);
  cursor: pointer; background: none; border: 0; padding: 0; transition: gap 0.25s var(--sd-spring); }
.ilink:hover { gap: 10px; }
.ilink .ic { width: 11px; height: 11px; }

/* ── landed shelf ── */
.shelf { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
@media (max-width: 900px) { .shelf { grid-template-columns: repeat(2, 1fr); } }
.shelf-it { display: flex; align-items: center; gap: 10px; padding: 11px 13px; border-radius: 11px;
  cursor: pointer; background: none; text-align: left;
  border: 1px solid rgba(251, 146, 60, 0.13); font-size: 10px; font-weight: 600;
  letter-spacing: 0.1em; transition: all 0.2s; }
.shelf-it:hover { border-color: rgba(251, 146, 60, 0.35); transform: translateY(-2px); }
.shelf-it .sid { color: var(--sd-fun-wall-ink); }
.shelf-it .sv { color: #ffd9a8; font-size: 8.5px; border: 1px solid rgba(251, 146, 60, 0.3);
  padding: 3px 5px; border-radius: 4px; }
.shelf-it .mt { color: var(--sd-fun-wall-dim); margin-left: auto; font-variant-numeric: tabular-nums; }
.pirtag { border-radius: 5px; padding: 3px 6px; font-size: 8.5px; font-weight: 700; letter-spacing: 0.14em; }
.pirtag.filed { color: var(--sd-fun-resolved); border: 1px solid rgba(52, 211, 153, 0.35); }
.pirtag.owed { color: #ffd08a; border: 1px solid rgba(251, 191, 36, 0.4); animation: gb-soft 1.8s infinite; }
.pirtag.appr { color: var(--sd-fun-resolved); background: rgba(52, 211, 153, 0.12); }

/* ═════ LIGHT THEME OVERRIDES ═════
   The stage is a display panel — it stays obsidian in BOTH themes. Only its
   drop shadow softens on cream so the wall doesn't look pasted on. */
[data-theme="light"] .stage { box-shadow: 0 24px 60px rgba(90, 62, 24, 0.28),
  inset 0 1px 0 rgba(244, 227, 203, 0.05); }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .stage-top .live i,
  html:not([data-cinematic="on"]) .tile,
  html:not([data-cinematic="on"]) .tile.promoted .tin,
  html:not([data-cinematic="on"]) .tile.demoted .tin,
  html:not([data-cinematic="on"]) .pulse-count,
  html:not([data-cinematic="on"]) .dk-hold,
  html:not([data-cinematic="on"]) .cadr.over,
  html:not([data-cinematic="on"]) .pirtag.owed { animation: none !important; }
  html:not([data-cinematic="on"]) .sweep { display: none; }
}
</style>
