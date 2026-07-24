<template>
  <!-- SdIncFrontPage — "THE DAILY FAULT" front page (agent Critical desk hero).
       1:1 Vue port of the winning artifact (agent-05-daily-fault): top plate + live
       clock, masthead, self-typesetting headline, hand-circled posture indices,
       the LEAD SPREAD (two-column editorial story with drop cap + self-drawing
       red-ink annotations + MI chop stamp), LATEST WIRES rail (live-printing typed
       lines), exposure choropleth, MI Promotion Notice and the archive clipping.
       Everything is driven by REAL data (stats / rows / peek intel) — the section
       owns all API calls; this component only reads props and emits verbs. -->
  <div class="tdf-front">
    <!-- ░░ top plate ░░ -->
    <div class="plate">
      <span class="press-dot" aria-hidden="true" />
      <span class="crumb"><b>FAULT GRID</b> <span>· CRITICAL INCIDENTS · SEV1∪SEV2</span></span>
      <span class="spacer" />
      <span v-if="deskName">DESK: {{ deskName.toUpperCase() }} — ON SHIFT</span>
      <span class="liveclock num">{{ clockHm }}:<span class="sec">{{ clockS }}</span> {{ tz }}</span>
    </div>

    <!-- ░░ masthead ░░ -->
    <header class="masthead">
      <h1 class="mast-title">The Daily <span class="fault">Fault</span></h1>
      <div class="mast-flank">
        <span>VOL. {{ vol }} · Nº {{ editionNo }}</span>
        <span class="ed">SEV1 ∪ SEV2 EDITION — SET CONTINUOUSLY BY THE DESK</span>
        <span>PRICE: ONE ACK</span>
      </div>
      <div class="dateline">
        <span>{{ dateline }}</span>
        <span>·</span>
        <span class="clock2 num">{{ clockHm }}:{{ clockS }} {{ tz }}</span>
        <span>·</span>
        <span>SHIFT EDITION — REPRINTED EVERY 60s FROM THE LIVE WIRE</span>
      </div>
    </header>

    <!-- ░░ headline block ░░ -->
    <section class="headline-block" aria-label="Front page headline">
      <p class="kicker"><span class="rule-l" />THE FRONT PAGE · EXPOSURE AT PRESS TIME</p>
      <h2 class="headline" :class="{ 'is-set': headSet }" :aria-label="headlinePlain">
        <template v-for="(w, i) in headWords" :key="`${w.w}-${i}`">
          <span class="w" :class="{ em: w.em }"
            :style="{ transitionDelay: (reduced ? 0 : 0.18 + i * 0.11) + 's' }">{{ w.w }}</span>{{ i < headWords.length - 1 ? ' ' : '' }}
        </template>
      </h2>
      <p class="deck">{{ deck }}</p>
      <div class="cta-row">
        <button class="cta primary" @click="$emit('ack')">
          <Check :size="14" /> Ack the next unacked
        </button>
        <button class="cta" @click="$emit('war', warLead || lead)">
          <Radio :size="14" /> {{ warLead ? 'Join the war room · live' : 'Join the war room' }}
        </button>
        <button class="cta" :disabled="!lead" @click="lead && $emit('sitrep', lead)">
          <Printer :size="14" /> Print sitrep
        </button>
      </div>
    </section>

    <!-- ░░ THE INDEX — hand-circled numerals, click to filter ░░ -->
    <section class="indices" aria-label="Posture lenses — click to filter the registry">
      <button v-for="(c, i) in indices" :key="c.key" class="index-chip" :class="{ red: c.red }"
        :aria-pressed="activeKey === c.key ? 'true' : 'false'" :style="{ '--d': (0.1 + i * 0.1) + 's' }"
        @click="$emit('lens', c.key)">
        <span class="index-figure">
          <svg viewBox="0 0 58 58" aria-hidden="true">
            <ellipse pathLength="100" cx="29" cy="29" :rx="ringGeo(i).rx" :ry="ringGeo(i).ry"
              :transform="`rotate(${ringGeo(i).rot} 29 29)`" />
            <!-- the active lens is circled TWICE — the second ring only prints when pressed -->
            <ellipse v-if="activeKey === c.key" class="ring2" pathLength="100" cx="29" cy="29"
              :rx="ringGeo(i).rx - 3" :ry="ringGeo(i).ry + 2" :transform="`rotate(${-ringGeo(i).rot} 29 29)`" />
          </svg>
          <span class="n num">{{ c.count }}</span>
        </span>
        <span class="index-label">{{ c.label }}</span>
      </button>
    </section>
    <p class="filter-note">CLICK AN INDEX TO SET THE REGISTRY FILTER — ACTIVE:
      <b>{{ activeLabel }} · {{ total }} SHOWING</b>
      <template v-if="q"> · WIRE SEARCH <b>“{{ q }}”</b>
        <button class="q-clear" title="Clear the search" @click="$emit('clear-q')">✗</button>
      </template>
    </p>

    <!-- ░░ LEAD SPREAD + WIRES ░░ -->
    <div class="spread">
      <article class="lead" :aria-label="lead ? `Lead story — ${lead.ticket_number}` : 'Lead story'">
        <div class="section-rule">The Lead <span class="tag">SELF-ANNOTATING</span></div>

        <template v-if="lead">
          <div class="lead-slug">
            <span class="id num">{{ lead.ticket_number }}</span>
            <span class="sev-badge" :class="lead.sev === 1 ? 's1' : 's2'">
              {{ lead.sev === 1 ? 'SEV1 · MAJOR' : 'SEV2 · CRITICAL' }}</span>
            <span v-for="c in leadChips" :key="c.label" class="chip" :class="c.cls">{{ c.label }}</span>
          </div>
          <div class="lead-headwrap">
            <h3 class="lead-head">{{ lead.subject }}</h3>
            <button v-if="lead.is_major_incident" class="stamp"
              aria-label="Major incident — open the war room" @click="$emit('war', lead)">
              MI · WAR ROOM {{ lead.war_room_url ? 'LIVE' : 'OPEN' }}</button>
          </div>
          <p class="lead-standfirst">{{ standfirst }}</p>

          <div class="lead-body">
            <div class="lead-cols">
              <p class="byline">{{ byline }}</p>
              <p>{{ p1a }}
                <template v-if="leadServices">
                  <span class="ann ann-under" :title="`Affected services — ${leadServices}`">{{ leadServices }}<svg
                      viewBox="0 0 80 9" preserveAspectRatio="none"><path pathLength="120"
                        d="M2 5 C 18 2, 30 8, 46 4 S 70 3, 78 6" style="--d: 1.6s" /></svg></span>{{ p1b }}
                </template>
              </p>
              <p>At press time the blast radius
                <template v-if="lead.affected_users != null">holds at
                  <button class="ann ann-circle num" title="Affected users — click to open the registry row"
                    @click="$emit('focus', lead.id)">{{ fmtUsers(lead.affected_users) }} users<svg
                      viewBox="0 0 110 40" preserveAspectRatio="none"><ellipse pathLength="120" cx="55" cy="20"
                        rx="52" ry="16" transform="rotate(-2 55 20)" style="--d: 1.9s" /></svg></button>{{ p2b }}
                </template>
                <template v-else>is
                  <button class="ann ann-circle" title="No affected-user figure filed — stamp it from Impact"
                    @click="$emit('focus', lead.id)">unassessed<svg viewBox="0 0 110 40"
                      preserveAspectRatio="none"><ellipse pathLength="120" cx="55" cy="20" rx="52" ry="16"
                        transform="rotate(-2 55 20)" style="--d: 1.9s" /></svg></button> — the impact panel wants a hand.
                </template>
              </p>
              <p>{{ p3a }}
                <template v-if="lead.child_count > 0">
                  <span class="ann ann-under" :title="`Linked children ride the registry`">linked below the fold<svg
                      viewBox="0 0 80 9" preserveAspectRatio="none"><path pathLength="120"
                        d="M2 6 C 20 3, 36 7, 52 4 S 72 4, 78 5" style="--d: 2.2s" /></svg></span>.
                </template>
              </p>
              <p>{{ p4 }} The SLA clock — the figure circled in the margin — is the one number this page
                will not let the desk forget.</p>
            </div>

            <aside class="figures">
              <svg class="margin-arrow" viewBox="0 0 46 70" aria-hidden="true">
                <path pathLength="160" d="M4 64 C 10 40, 18 26, 34 14 M 26 12 L 35 13 L 33 22" />
              </svg>
              <span class="margin-note">breach clock — watch this</span>
              <div class="figures-box">
                <h4>Key figures</h4>
                <div class="fig-row"><span class="k">Breach in</span>
                  <span class="v num" :class="slaFig.cls">{{ slaFig.v }}</span></div>
                <div class="fig-row"><span class="k">Next update</span>
                  <span class="v num" :class="cadFig.cls">{{ cadFig.v }}</span></div>
                <div class="fig-row"><span class="k">Users</span>
                  <span class="v num">{{ lead.affected_users != null ? fmtNum(lead.affected_users) : '—' }}</span></div>
                <div class="fig-row"><span class="k">Age</span>
                  <span class="v num">{{ sinceShort(lead.incident_detected_at || lead.created_at) }}</span></div>
                <div class="fig-row"><span class="k">Bridge</span>
                  <span class="v num" :class="lead.war_room_url ? 'live' : ''">{{ lead.war_room_url ? 'LIVE' : '—' }}</span></div>
                <div class="fig-row"><span class="k">Playbook</span>
                  <span class="v num">{{ lead.task_total ? `${lead.task_done}/${lead.task_total}` : '—' }}</span></div>
              </div>
              <div v-if="sparkPts" class="pressure">
                <div class="cap"><span>14D PRESSURE</span><b class="num">{{ sparkCap }}</b></div>
                <svg class="spark" :class="{ flash: sparkFlash }" viewBox="0 0 208 44"
                  preserveAspectRatio="none" aria-hidden="true">
                  <path class="area" :d="sparkPts.area" />
                  <path class="line" :d="sparkPts.line" />
                  <circle class="dot" :cx="sparkPts.cx" :cy="sparkPts.cy" r="2.5" />
                </svg>
              </div>
            </aside>
          </div>
        </template>

        <!-- the quiet edition — zero SEV1∪SEV2 standing -->
        <template v-else>
          <div class="lead-slug">
            <span class="id num">—</span>
            <span class="sev-badge s2">CLEAN SHEET</span>
          </div>
          <h3 class="lead-head">The floor holds; the desk prints a quiet edition</h3>
          <p class="lead-standfirst">No SEV1 or SEV2 stands on your seal at press time.</p>
          <div class="lead-body">
            <div class="lead-cols">
              <p class="byline">FROM THE DESK · NOTHING TO DECLARE</p>
              <p>Zero faults claim the lead this edition. The registry below prints a clean sheet, and
                yesterday's resolutions carry the only ink worth reading. When the first SEV2 lands,
                this spread typesets itself around it — blast radius, cadence promise and the breach
                clock circled in the margin.</p>
              <p>Until then the wire keeps printing, the indices hold at their zeros, and the price of
                the paper stays the same: one ack, paid promptly.</p>
            </div>
            <aside class="figures">
              <div class="figures-box">
                <h4>Key figures</h4>
                <div class="fig-row"><span class="k">Breach in</span><span class="v num">—</span></div>
                <div class="fig-row"><span class="k">Next update</span><span class="v num">—</span></div>
                <div class="fig-row"><span class="k">Users</span><span class="v num">0</span></div>
                <div class="fig-row"><span class="k">Bridge</span><span class="v num">—</span></div>
              </div>
              <div v-if="sparkPts" class="pressure">
                <div class="cap"><span>14D PRESSURE</span><b class="num">{{ sparkCap }}</b></div>
                <svg class="spark" viewBox="0 0 208 44" preserveAspectRatio="none" aria-hidden="true">
                  <path class="area" :d="sparkPts.area" />
                  <path class="line" :d="sparkPts.line" />
                  <circle class="dot" :cx="sparkPts.cx" :cy="sparkPts.cy" r="2.5" />
                </svg>
              </div>
            </aside>
          </div>
        </template>

        <!-- second story -->
        <div v-if="second" class="second-story">
          <div>
            <div class="lead-slug">
              <span class="id num">{{ second.ticket_number }}</span>
              <span class="sev-badge" :class="second.sev === 1 ? 's1' : 's2'">SEV{{ second.sev }}{{ second.is_major_incident ? ' · MAJOR' : '' }}</span>
              <span v-if="secondChip" class="chip" :class="secondChip.cls">{{ secondChip.label }}</span>
            </div>
            <h3>{{ second.subject }}</h3>
            <p class="txt">{{ secondTxt }}</p>
            <span v-if="secondOverdue" class="overdue-flag">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
              CADENCE OVERDUE — <span class="num">{{ sinceShort(second.next_update_due_at) }}</span> PAST PROMISE
            </span>
          </div>
          <div>
            <div v-if="second.sla_paused_since" class="paused-note">SLA CLOCK — PAUSED<br>stop-the-clock granted {{ hhmm(second.sla_paused_since) }}</div>
            <div v-else class="paused-note">{{ secondSideNote }}</div>
            <p class="txt editors-note">Editor's note: a paused clock is not a paused fault.
              The cadence promise stands while the desk works.</p>
          </div>
        </div>
      </article>

      <!-- LATEST WIRES -->
      <aside class="wires" aria-label="Latest wires — live cadence updates">
        <div class="wires-head"><span>Latest Wires</span><span class="live">PRINTING</span></div>
        <div class="wire-list" aria-live="polite">
          <div v-for="w in wires" :key="w.key" class="wire" :class="{ red: w.red }">
            <span class="t num">{{ w.t }}</span><span class="id num">{{ w.id }}</span> —
            {{ w.done ? w.txt : w.shown }}<span v-if="!w.done" class="caret" aria-hidden="true" />
          </div>
          <div v-if="!wires.length" class="wire dim">The wire is warming up — first print lands with the next poll.</div>
        </div>
        <div class="wires-foot">WIRE PRINTS ON THE 60s POLL · CADENCE UPDATES, ACKS, DECISIONS<br>SOURCE: DESK EVENT STREAM</div>
      </aside>
    </div>

    <!-- ░░ DATA ROW: exposure choropleth + MI promotion notice + archive clipping ░░ -->
    <div class="data-row">
      <section class="databox" aria-label="Exposure rollup">
        <h4>Exposure Rollup <span class="sub">tinted by column-inches at risk · click to filter</span></h4>
        <div class="choro">
          <button v-for="e in exposures" :key="e.key" :class="e.cls"
            :aria-pressed="activeKey === e.key ? 'true' : 'false'" @click="$emit('lens', e.key)">
            <span class="cl">{{ e.label }}</span><span class="cn num">{{ e.count }}</span>
          </button>
        </div>
        <div class="users-line">
          <span>AFFECTED USERS, THIS PAGE&nbsp; <span class="big num">{{ fmtNum(usersTotal) }}</span></span>
          <span v-if="unassessedCount > 0" class="red">UNASSESSED DEBT: {{ unassessedCount }} FAULT{{ unassessedCount === 1 ? '' : 'S' }}</span>
          <span v-else>EXPOSURE FULLY ASSESSED</span>
        </div>
      </section>

      <section class="correction" :aria-label="candidate ? `MI promotion path — ${candidate.ticket_number}` : 'MI promotion path'">
        <span class="rub">Promotion Notice</span>
        <template v-if="candidate">
          <p class="slug2"><span class="id num">{{ candidate.ticket_number }}</span> · SEV2 → PROPOSED MAJOR</p>
          <blockquote>“{{ candidate.mi_proposal_note || 'no note filed' }}” — {{ candidate.mi_proposed_by_name || 'a teammate' }}, proposing</blockquote>
          <p class="meta">FILED <span class="up num">{{ sinceShort(candidate.mi_proposed_at) }}</span> AGO ·
            {{ (candidate.subject || '').toUpperCase().slice(0, 44) }}<template v-if="candidate.affected_users != null"> · {{ fmtNum(candidate.affected_users) }} USERS</template></p>
          <div class="acts">
            <span class="awaiting">AWAITING LEAD</span>
            <button class="mini-verb" @click="$emit('focus', candidate.id)">Hold &amp; wait</button>
            <button v-if="canRule" class="mini-verb" @click="$emit('declare', candidate)">Rule — confirm / decline</button>
            <button v-if="canWithdraw" class="mini-verb red" @click="$emit('withdraw', candidate)">Withdraw proposal</button>
          </div>
        </template>
        <template v-else>
          <p class="slug2"><span class="id">NO CANDIDATE ON THE WIRE</span></p>
          <blockquote>“When a SEV2 starts growing, propose it from the row's tray — the lead confirms
            or declines, and the notice prints here.”</blockquote>
          <p class="meta">LAST 30 DAYS · PROPOSED <span class="up num">{{ promoCounts.proposed }}</span> ·
            CONFIRMED <span class="num">{{ promoCounts.confirmed }}</span> ·
            DECLINED <span class="num">{{ promoCounts.declined }}</span></p>
        </template>
      </section>

      <section class="clipping" aria-label="Similar incident intel">
        <template v-if="intel && intel.item">
          <p class="rep">{{ intel.repeat ? `Possible repeat — ×${intel.count} in 90 days` : 'Precedent on file' }}</p>
          <h5><span class="id num">{{ intel.item.ticket_number }}</span> · {{ intel.item.subject }}</h5>
          <p>{{ clippingBody }}</p>
          <a role="button" tabindex="0" @click="$emit('open', intel.item.id)"
            @keydown.enter="$emit('open', intel.item.id)">Open the clipping →</a>
        </template>
        <template v-else>
          <p class="rep dim">No repeat signature</p>
          <h5>{{ lead ? 'This fault writes fresh history' : 'The archive rests' }}</h5>
          <p>{{ lead ? 'No terminal precedent from the last 180 days shares this fault\'s category, services or subject line — the fix will be a first edition.'
            : 'When a fault leads the spread, its closest precedent from the archive prints here with the recorded fix.' }}</p>
        </template>
      </section>
    </div>
  </div>
</template>

<script setup>
/*
  Props are the frozen instrument contract ({ stats, rows, now, arrivals, reduced })
  plus the presentation extras the section computes through useCriticalDesk's
  selectors (indices / exposures / total / activeKey — NEVER inlined stats.critical.*
  here). Emits: lens(key) / focus(id) / open(id) plus the front-page verbs
  (ack / war / sitrep / declare / withdraw / clear-q).
*/
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { Check, Radio, Printer } from 'lucide-vue-next'

const props = defineProps({
  stats: { type: Object, default: null },
  rows: { type: Array, default: () => [] },
  now: { type: Number, default: () => Date.now() },
  arrivals: { type: Object, default: () => ({ count: 0, ids: [] }) },
  reduced: { type: Boolean, default: false },
  // presentation extras (computed by the section through the desk's selectors)
  indices: { type: Array, default: () => [] },
  exposures: { type: Array, default: () => [] },
  total: { type: Number, default: 0 },
  activeKey: { type: String, default: 'all' },
  q: { type: String, default: '' },
  lead: { type: Object, default: null },
  second: { type: Object, default: null },
  candidate: { type: Object, default: null },
  canRule: { type: Boolean, default: false },
  canWithdraw: { type: Boolean, default: false },
  promoCounts: { type: Object, default: () => ({ proposed: 0, confirmed: 0, declined: 0 }) },
  intel: { type: Object, default: null },
  deskName: { type: String, default: '' },
})
defineEmits(['lens', 'focus', 'open', 'ack', 'war', 'sitrep', 'declare', 'withdraw', 'clear-q'])

/* ── clocks, dateline, edition ── */
const pad = (n) => String(n).padStart(2, '0')
const clockHm = computed(() => { const d = new Date(props.now); return `${pad(d.getHours())}:${pad(d.getMinutes())}` })
const clockS = computed(() => pad(new Date(props.now).getSeconds()))
const tz = (() => {
  try {
    const part = new Intl.DateTimeFormat([], { timeZoneName: 'short' }).formatToParts(new Date())
      .find((p) => p.type === 'timeZoneName')
    return (part?.value || '').replace(/\s/g, '') || 'LOCAL'
  } catch { return 'LOCAL' }
})()
const dateline = computed(() => new Date(props.now)
  .toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  .replace(/,/g, ' ·').toUpperCase())
const ROMAN = ['—', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
const vol = computed(() => ROMAN[Math.max(1, Math.min(12, new Date(props.now).getFullYear() - 2019))])
const editionNo = computed(() => {
  const d = new Date(props.now)
  return Math.ceil((d - new Date(d.getFullYear(), 0, 0)) / 864e5)
})

/* ── shared time labels ── */
const hhmm = (ts) => (ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—')
const shortMin = (ms) => {
  const m = Math.max(0, Math.round(ms / 60000))
  return m >= 60 ? `${Math.floor(m / 60)}h ${pad(m % 60)}m` : `${m}m`
}
const sinceShort = (ts) => (ts ? shortMin(props.now - new Date(ts).getTime()) : '—')
const untilShort = (ts) => (ts ? shortMin(new Date(ts).getTime() - props.now) : '—')
const fmtDur = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60
  return h > 0 ? `${h}h ${pad(m)}m ${pad(ss)}s` : `${m}m ${pad(ss)}s`
}
const fmtNum = (n) => (n == null ? '—' : Number(n).toLocaleString())
const fmtUsers = (n) => (n >= 10000 ? `${Math.round(n / 1000)}k` : fmtNum(n))

/* ── the self-typesetting headline ── */
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const word = (n) => (n <= 12 ? WORDS[n] : String(n))
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const idx = (k) => props.indices.find((c) => c.key === k)?.count || 0
const headWords = computed(() => {
  const s1 = idx('sev1'), s2 = idx('sev2')
  if (s1 > 0 && s2 > 0) return [
    { w: cap(word(s1)) }, { w: s1 === 1 ? 'major' : 'majors' }, { w: 'burning;', em: true },
    { w: word(s2) }, { w: s2 === 1 ? 'critical' : 'criticals' }, { w: s2 === 1 ? 'holds' : 'hold' },
    { w: 'the' }, { w: 'line.' }]
  if (s1 > 0) return [
    { w: cap(word(s1)) }, { w: s1 === 1 ? 'major' : 'majors' }, { w: 'burning;', em: true },
    { w: 'the' }, { w: 'floor' }, { w: 'holds' }, { w: 'nothing' }, { w: 'else.' }]
  if (s2 > 0) return [
    { w: 'No' }, { w: 'majors' }, { w: 'burning;' },
    { w: word(s2) }, { w: s2 === 1 ? 'critical' : 'criticals', em: true },
    { w: s2 === 1 ? 'holds' : 'hold' }, { w: 'the' }, { w: 'line.' }]
  return [{ w: 'No' }, { w: 'faults' }, { w: 'standing;' }, { w: 'the' }, { w: 'desk' },
    { w: 'prints' }, { w: 'a' }, { w: 'quiet', em: true }, { w: 'edition.' }]
})
const headlinePlain = computed(() => headWords.value.map((w) => w.w).join(' '))
const headSet = ref(false)
watch(headlinePlain, () => {
  headSet.value = false
  requestAnimationFrame(() => requestAnimationFrame(() => { headSet.value = true }))
}, { immediate: true })

/* ── deck (standfirst under the headline) ── */
const lastPrintAt = ref(Date.now())
watch(() => props.stats, () => { lastPrintAt.value = Date.now() })
const unassessedCount = computed(() => props.exposures.find((e) => e.key === 'unassessed')?.count || 0)
const deck = computed(() => {
  const at = hhmm(lastPrintAt.value)
  const l = props.lead
  const leadBit = l
    ? `${l.category_name || l.team_name || 'The lead fault'} leads the spread${l.war_room_url ? ' with the war room live' : ''}`
    : 'No fault claims the lead'
  const debtBit = unassessedCount.value > 0
    ? `${cap(word(unassessedCount.value))} column-inch${unassessedCount.value === 1 ? '' : 'es'} of exposure remain${unassessedCount.value === 1 ? 's' : ''} unassessed`
    : 'Every exposure on the floor is assessed'
  return `Set at ${at} from the live wire. ${leadBit}; ${debtBit.toLowerCase()} — the registry below carries the full docket.`
})

/* ── index ring geometry (hand-drawn wobble, cycled like the artifact) ── */
const RINGS = [
  { rx: 25, ry: 22, rot: -4 }, { rx: 24, ry: 23, rot: 5 }, { rx: 25, ry: 21, rot: -7 },
  { rx: 24, ry: 22, rot: 3 }, { rx: 25, ry: 22, rot: -3 }, { rx: 24, ry: 23, rot: 6 },
  { rx: 25, ry: 21, rot: -5 }, { rx: 24, ry: 22, rot: 4 }, { rx: 25, ry: 22, rot: -6 },
]
const ringGeo = (i) => RINGS[i % RINGS.length]
const activeLabel = computed(() =>
  (props.indices.find((c) => c.key === props.activeKey)
    || props.exposures.find((e) => e.key === props.activeKey))?.label?.toUpperCase() || 'ALL FAULTS')

/* ── lead-story copy (composed from the real row) ── */
const warLead = computed(() => props.rows.find((r) => r.is_major_incident && r.war_room_url) || null)
const leadChips = computed(() => {
  const l = props.lead
  if (!l) return []
  const out = []
  if (l.revenue_impact) out.push({ label: 'REVENUE', cls: 'exp' })
  if (l.public_impact) out.push({ label: 'PUBLIC', cls: 'exp' })
  if (l.compliance_impact) out.push({ label: 'COMPLIANCE', cls: 'exp' })
  if (l.security_impact) out.push({ label: 'SECURITY', cls: 'expred' })
  if (l.child_count > 0) out.push({ label: `${l.child_count} CHILD${l.child_count === 1 ? '' : 'REN'}`, cls: 'link' })
  return out.slice(0, 4)
})
const shortName = (n) => {
  const p = String(n || '').trim().split(/\s+/)
  return p.length > 1 ? `${p[0][0]}. ${p[p.length - 1]}` : (n || '')
}
const byline = computed(() => {
  const l = props.lead
  if (!l) return ''
  const cmdr = l.incident_commander_name ? `CMDR ${shortName(l.incident_commander_name).toUpperCase()}` : 'CMDR UNSTAFFED'
  const pen = l.assigned_agent_name ? `PEN HELD BY ${shortName(l.assigned_agent_name).toUpperCase()}` : 'NO PEN ON THE FAULT'
  return `FROM THE BRIDGE · ${cmdr} · ${pen}`
})
const standfirst = computed(() => {
  const l = props.lead
  if (!l) return ''
  const opened = `Opened at ${hhmm(l.incident_detected_at || l.created_at)}`
  const ack = l.acknowledged_at
    ? `the desk acknowledged at ${hhmm(l.acknowledged_at)}`
    : 'the desk has yet to acknowledge'
  const cad = l.update_interval_minutes
    ? `Updates are promised every ${l.update_interval_minutes} minutes.`
    : 'No update cadence is promised yet.'
  return `${opened} and ${ack}. ${cad}`
})
const leadServices = computed(() => {
  const s = props.lead?.affected_services || []
  return s.length ? s.slice(0, 2).join(', ') : ''
})
const p1a = computed(() => {
  const l = props.lead
  if (!l) return ''
  const lane = l.team_name ? `the ${l.team_name} lane` : 'an unrouted lane'
  const cat = l.category_name ? `filed under ${l.category_name}` : 'filed uncategorised'
  const svc = leadServices.value
    ? 'Service exposure runs through the '
    : 'No affected services are stamped yet — the impact panel wants a hand.'
  return `The fault opened on the desk at ${hhmm(l.created_at)}, ${cat} on ${lane}. ${svc}`
})
const p1b = ' corridor — the fault line, not the whole grid.'
const p2b = computed(() => {
  const l = props.lead
  if (!l) return '.'
  const bi = l.business_impact ? `, with business impact filed ${String(l.business_impact).toUpperCase()}` : ', with no business impact filed'
  const rev = l.revenue_impact ? ` Revenue exposure is on the record: ${l.revenue_impact}.` : ''
  return `${bi}.${rev}`
})
const p3a = computed(() => {
  const l = props.lead
  if (!l) return ''
  const cmdr = l.incident_commander_name
    ? `${shortName(l.incident_commander_name)} commands the bridge`
    : 'The commander\'s chair is unstaffed'
  const war = l.war_room_url ? ' and the war room holds a burning line' : ''
  const kids = l.child_count > 0
    ? ` ${cap(word(l.child_count))} child fault${l.child_count === 1 ? ' rides' : 's ride'} the docket, `
    : ' No children are linked below the fold.'
  return `${cmdr}${war}.${kids}`
})
const p4 = computed(() => {
  const l = props.lead
  if (!l) return ''
  if (!l.update_interval_minutes) return 'No cadence promise is set — the tray\'s Update verb writes one.'
  const due = l.next_update_due_at
    ? (new Date(l.next_update_due_at).getTime() > props.now
      ? `the next filing is due in ${untilShort(l.next_update_due_at)}`
      : `the filing runs ${sinceShort(l.next_update_due_at)} past its promise`)
    : 'the next filing is unscheduled'
  return `Cadence is promised at ${l.update_interval_minutes} minutes and ${due}.`
})

/* ── the margin figures ── */
const slaFig = computed(() => {
  const l = props.lead
  if (!l) return { v: '—', cls: '' }
  if (l.sla_paused_since) return { v: 'PAUSED', cls: '' }
  if (l.sla_resolution_breached) return { v: `+${sinceShort(l.resolution_due_at)}`, cls: 'red' }
  if (!l.resolution_due_at) return { v: '—', cls: '' }
  const ms = new Date(l.resolution_due_at).getTime() - props.now
  if (ms <= 0) return { v: 'DUE NOW', cls: 'red' }
  return { v: fmtDur(ms), cls: ms < 2 * 36e5 ? 'red' : (ms < 4 * 36e5 ? 'warn' : 'live') }
})
const cadFig = computed(() => {
  const l = props.lead
  if (!l || !l.next_update_due_at) return { v: '—', cls: '' }
  const ms = new Date(l.next_update_due_at).getTime() - props.now
  if (ms <= 0) return { v: `+${shortMin(-ms)}`, cls: 'red' }
  return { v: fmtDur(ms), cls: 'gold' }
})

/* ── 14d pressure sparkline (stats.trend_14d — real created counts) ── */
const sparkFlash = ref(false)
let sparkTimer = null
watch(() => props.arrivals?.count, (c) => {
  if (!c) return
  sparkFlash.value = true
  clearTimeout(sparkTimer)
  sparkTimer = setTimeout(() => { sparkFlash.value = false }, 1200)
})
const sparkCap = computed(() => {
  const t = props.stats?.trend_14d || []
  return t.length ? `${t[t.length - 1].created} NEW` : '—'
})
const sparkPts = computed(() => {
  const t = props.stats?.trend_14d || []
  if (t.length < 2) return null
  const max = Math.max(1, ...t.map((p) => p.created))
  const pts = t.map((p, i) => [
    Math.round(i * (206 / (t.length - 1)) * 10) / 10,
    Math.round((40 - (p.created / max) * 32) * 10) / 10,
  ])
  const line = 'M' + pts.map((p) => `${p[0]} ${p[1]}`).join(' L')
  const area = `${line} L206 44 L0 44 Z`
  const last = pts[pts.length - 1]
  return { line, area, cx: last[0], cy: last[1] }
})

/* ── second story ── */
const secondChip = computed(() => {
  const s = props.second
  if (!s) return null
  if (s.security_impact) return { label: 'SECURITY', cls: 'expred' }
  if (s.revenue_impact) return { label: 'REVENUE', cls: 'exp' }
  if (s.public_impact) return { label: 'PUBLIC', cls: 'exp' }
  if (s.compliance_impact) return { label: 'COMPLIANCE', cls: 'exp' }
  return null
})
const secondOverdue = computed(() => {
  const s = props.second
  return !!(s?.next_update_due_at && new Date(s.next_update_due_at).getTime() < props.now)
})
const secondTxt = computed(() => {
  const s = props.second
  if (!s) return ''
  const who = s.assigned_agent_name ? `${shortName(s.assigned_agent_name)} holds the fault` : 'The fault runs unowned'
  const alone = s.is_major_incident && !s.incident_commander_id ? '; the commander\'s chair is unstaffed' : ''
  const users = s.affected_users != null ? ` ${fmtNum(s.affected_users)} users ride the fault.` : ''
  const cad = s.update_interval_minutes
    ? ` The desk promised ${s.update_interval_minutes}-minute updates.`
    : ' No cadence promise is on record.'
  return `${who}${alone}.${users}${cad}`
})
const secondSideNote = computed(() => {
  const s = props.second
  if (!s) return ''
  if (s.sla_resolution_breached) return 'SLA CLOCK — BREACHED'
  if (s.resolution_due_at) return `SLA CLOCK — −${untilShort(s.resolution_due_at)}`
  return 'SLA CLOCK — UNARMED'
})

/* ── LATEST WIRES — the paper live-prints itself from stats.feed ── */
const FEED_VERBS = {
  created: 'Fault raised', acknowledged: 'Acknowledged', escalated: 'Escalated',
  status_changed: 'Status moved', resolved: 'Resolved', closed: 'Closed',
  major_incident: 'Major declared', decision_logged: 'Decision logged',
  incident_roles_set: 'Roster staffed', pir_created: 'PIR opened', pir_submitted: 'PIR submitted',
  pir_approved: 'PIR approved', pir_published: 'PIR published', reopened: 'Fault returned',
  task_added: 'Task staged', playbook_applied: 'Playbook applied', task_status: 'Task ticked',
  incident_sev_changed: 'Severity reclassified', mi_proposed: 'MI proposed',
  mi_confirmed: 'MI confirmed', mi_declined: 'MI declined',
}
const RED_ACTIONS = new Set(['escalated', 'major_incident', 'reopened', 'mi_proposed'])
const wires = ref([])
const typeTimers = new Set()
let wiresSeeded = false
const trunc = (s, n) => (String(s || '').length > n ? `${String(s).slice(0, n - 1)}…` : String(s || ''))
const wireText = (f) => {
  const verb = FEED_VERBS[f.action] || String(f.action || '').replace(/_/g, ' ')
  return `${verb}${f.actor ? ` by ${shortName(f.actor)}` : ''} — ${trunc(f.subject, 64)}`
}
const typeWire = (w) => {
  if (props.reduced) { w.shown = w.txt; w.done = true; return }
  let i = 0
  const iv = setInterval(() => {
    i += 1
    w.shown = w.txt.slice(0, i)
    if (i >= w.txt.length) { clearInterval(iv); typeTimers.delete(iv); w.done = true }
  }, 22)
  typeTimers.add(iv)
}
const pushWire = (w, live) => {
  const entry = { ...w, shown: live ? '' : w.txt, done: !live }
  wires.value.push(entry)
  if (live) typeWire(wires.value[wires.value.length - 1])
  while (wires.value.length > 8) wires.value.shift()
}
const synthWires = () => {
  const out = []
  for (const r of props.rows) {
    if (out.length >= 6) break
    if (!r.acknowledged_at) out.push({ key: `syn-una-${r.id}`, t: hhmm(r.created_at), id: r.ticket_number, txt: `Filed unacknowledged — ${sinceShort(r.created_at)} on the clock.`, red: true })
    else if (r.next_update_due_at && new Date(r.next_update_due_at).getTime() < props.now) out.push({ key: `syn-ovr-${r.id}`, t: hhmm(r.next_update_due_at), id: r.ticket_number, txt: `Cadence promise overdue — ${sinceShort(r.next_update_due_at)} past the filing.`, red: true })
    else if (r.sla_paused_since) out.push({ key: `syn-pau-${r.id}`, t: hhmm(r.sla_paused_since), id: r.ticket_number, txt: 'SLA clock paused — stop-the-clock granted.' })
    else if (r.sla_resolution_breached) out.push({ key: `syn-brc-${r.id}`, t: hhmm(r.resolution_due_at), id: r.ticket_number, txt: 'SLA exceeded — the debt is on the record.', red: true })
    else if (r.next_update_due_at) out.push({ key: `syn-nxt-${r.id}`, t: hhmm(r.created_at), id: r.ticket_number, txt: `On promise — next filing due in ${untilShort(r.next_update_due_at)}.` })
  }
  return out.reverse()
}
watch([() => props.stats?.feed, () => props.rows], ([feed]) => {
  const items = (feed || [])
    .slice(0, 8)
    .map((f) => ({
      key: `${f.ticket_id}-${f.at}-${f.action}`,
      t: hhmm(f.at), id: f.ticket_number || '—', txt: wireText(f), red: RED_ACTIONS.has(f.action),
    }))
    .reverse() // oldest → newest; the column-reverse list prints newest on top
  if (!items.length) {
    if (!wiresSeeded && props.rows.length) { synthWires().forEach((w) => pushWire(w, false)); wiresSeeded = true }
    return
  }
  if (!wiresSeeded) {
    wires.value = []
    items.forEach((w) => pushWire(w, false))
    wiresSeeded = true
    return
  }
  const known = new Set(wires.value.map((w) => w.key))
  items.filter((w) => !known.has(w.key)).forEach((w) => pushWire(w, true))
}, { immediate: true, deep: false })
onBeforeUnmount(() => { typeTimers.forEach((iv) => clearInterval(iv)); clearTimeout(sparkTimer) })

/* ── choropleth footer line ── */
const usersTotal = computed(() => props.rows.reduce((a, r) => a + (r.affected_users || 0), 0))

/* ── archive clipping body ── */
const clippingBody = computed(() => {
  const it = props.intel?.item
  if (!it) return ''
  const when = it.resolved_at ? `Resolved ${sinceShort(it.resolved_at)} ago` : 'Resolved'
  const fix = it.resolution_summary || it.rca_summary
  return `${when}. ${props.intel.reason ? `${cap(props.intel.reason)}. ` : ''}${fix ? `The fix note reads: “${trunc(fix, 130)}”` : 'No fix note survived — open the clipping for the full record.'}`
})
</script>

<style scoped>
/* ══════════ THE DAILY FAULT — front page (sepia newsprint over --sd-inc-*) ══════════ */
.tdf-front { min-width: 0; }
.num { font-family: var(--sd-mono); font-variant-numeric: tabular-nums; font-feature-settings: "tnum"; }
button { font: inherit; color: inherit; background: none; border: none; cursor: pointer; }
:focus-visible { outline: 2px solid var(--sd-inc-core); outline-offset: 3px; border-radius: 2px; }

/* ░░ top plate ░░ */
.plate { display: flex; align-items: center; gap: 18px; padding: 12px 0 10px;
  border-bottom: 1px solid var(--df-rule);
  font-family: var(--sd-mono); font-size: 11px; letter-spacing: 0.14em; color: var(--df-ink-3); }
.plate .crumb b { color: var(--sd-inc-core); font-weight: 600; }
.plate .crumb span { opacity: 0.75; }
.plate .spacer { flex: 1; }
.plate .liveclock { color: var(--df-ink-2); letter-spacing: 0.1em; }
.plate .liveclock .sec { color: var(--sd-inc-core); }
.press-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--sd-inc-live);
  box-shadow: 0 0 0 0 var(--sd-inc-live-soft); animation: tdf-press 2.4s infinite; }
@keyframes tdf-press { 0% { box-shadow: 0 0 0 0 var(--sd-inc-live-soft); }
  70% { box-shadow: 0 0 0 8px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }

/* ░░ masthead ░░ */
.masthead { padding: 30px 0 14px; text-align: center; position: relative; }
.mast-title { font-weight: 800; letter-spacing: -0.035em; font-size: clamp(46px, 6.4vw, 86px);
  line-height: 0.94; color: var(--df-ink); text-transform: uppercase; margin: 0; text-wrap: balance; }
.mast-title .fault { background: var(--sd-inc-grad); -webkit-background-clip: text;
  background-clip: text; color: transparent; }
.mast-flank { display: flex; align-items: center; justify-content: space-between;
  font-family: var(--sd-mono); font-size: 10.5px; letter-spacing: 0.22em; color: var(--df-ink-3);
  text-transform: uppercase; margin-top: 14px; border-top: 3px double var(--df-rule-strong);
  border-bottom: 1px solid var(--df-rule); padding: 8px 4px; gap: 10px; flex-wrap: wrap; }
.mast-flank .ed { color: var(--sd-inc-core); font-weight: 600; }
.dateline { font-family: var(--sd-mono); font-size: 11px; letter-spacing: 0.16em; color: var(--df-ink-2);
  padding: 8px 4px 0; text-transform: uppercase; display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; }
.dateline .clock2 { color: var(--sd-inc-core); }

/* ░░ headline block ░░ */
.headline-block { padding: 40px 0 8px; border-bottom: 1px solid var(--df-rule); }
.kicker { font-family: var(--sd-mono); font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase;
  color: var(--sd-inc-core); margin: 0 0 16px; }
.kicker .rule-l { display: inline-block; width: 44px; height: 1px; background: var(--sd-inc-core);
  vertical-align: middle; margin-right: 12px; }
.headline { margin: 0; font-weight: 750; font-size: clamp(36px, 4.6vw, 64px); line-height: 1.04;
  letter-spacing: -0.028em; max-width: 19ch; color: var(--df-ink); text-wrap: balance; }
.headline .w { display: inline-block; opacity: 0; transform: translateY(26px) rotate(0.6deg);
  transition: opacity 0.7s var(--sd-spring), transform 0.7s var(--sd-spring); }
.headline.is-set .w { opacity: 1; transform: none; }
.headline .em { background: var(--sd-inc-grad); -webkit-background-clip: text;
  background-clip: text; color: transparent; }
.deck { font-family: var(--df-serif); font-style: italic; font-size: 17.5px; line-height: 1.6;
  color: var(--df-ink-2); max-width: 64ch; margin: 18px 0 0; }
.cta-row { display: flex; gap: 12px; margin: 26px 0 30px; flex-wrap: wrap; }
.cta { font-family: var(--sd-mono); font-size: 11.5px; letter-spacing: 0.12em; text-transform: uppercase;
  padding: 11px 20px; border: 1px solid var(--sd-inc-brd); border-radius: 3px; color: var(--df-ink-2);
  transition: transform 0.3s var(--sd-spring), box-shadow 0.3s var(--sd-spring), background 0.2s, color 0.2s;
  display: inline-flex; align-items: center; gap: 9px; }
.cta:hover { transform: translateY(-2px); color: var(--df-ink); }
.cta:active { transform: translateY(0) scale(0.98); }
.cta:disabled { opacity: 0.5; cursor: default; transform: none; }
.cta.primary { background: var(--sd-inc-grad); color: #1c1206; border-color: transparent; font-weight: 700;
  box-shadow: 0 6px 22px var(--sd-inc-soft); }
.cta.primary:hover { box-shadow: 0 10px 30px var(--sd-inc-soft); }

/* ░░ the index — circled numerals ░░ */
.indices { display: grid; grid-template-columns: repeat(9, 1fr); gap: 6px; padding: 22px 0 20px;
  border-bottom: 3px double var(--df-rule-strong); }
.index-chip { display: flex; flex-direction: column; align-items: center; gap: 9px;
  padding: 10px 4px 12px; border-radius: 6px; position: relative;
  transition: background 0.25s, transform 0.3s var(--sd-spring); }
.index-chip:hover { background: var(--df-goldwash); transform: translateY(-2px); }
.index-figure { position: relative; width: 58px; height: 58px; display: grid; place-items: center; }
.index-figure .n { font-size: 22px; font-weight: 700; color: var(--df-ink); position: relative; z-index: 2; }
.index-figure svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.index-figure ellipse { fill: none; stroke: var(--sd-inc-core); stroke-width: 1.8; stroke-linecap: round;
  stroke-dasharray: 100; stroke-dashoffset: 100; animation: tdf-ink 1s var(--sd-spring) forwards;
  animation-delay: var(--d, 0s); }
.index-figure .ring2 { stroke-width: 1.4; animation-delay: 0.15s; }
.index-chip.red .index-figure ellipse { stroke: var(--sd-inc-arc); stroke-width: 2.1; }
.index-chip.red .index-figure .n { color: var(--sd-inc-arc); }
@keyframes tdf-ink { to { stroke-dashoffset: 0; } }
.index-label { font-family: var(--sd-mono); font-size: 9.5px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--df-ink-3); text-align: center; line-height: 1.35; }
.index-chip[aria-pressed="true"] { background: var(--df-goldwash); }
.index-chip[aria-pressed="true"] .index-figure ellipse:first-child { fill: color-mix(in srgb, var(--sd-inc-core) 14%, transparent); }
.index-chip[aria-pressed="true"] .index-label { color: var(--sd-inc-core); }
.index-chip[aria-pressed="true"]::after { content: ""; position: absolute; left: 18%; right: 18%;
  bottom: 3px; height: 2px; background: var(--sd-inc-core); border-radius: 2px; }
.filter-note { font-family: var(--sd-mono); font-size: 10.5px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--df-ink-3); padding: 10px 2px 0; margin: 0; }
.filter-note b { color: var(--sd-inc-core); font-weight: 600; }
.q-clear { color: var(--sd-inc-arc); font-weight: 700; padding: 0 4px; }

/* ░░ lead spread grid ░░ */
.spread { display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: 0;
  border-bottom: 1px solid var(--df-rule); }
.lead { padding: 26px 30px 30px 0; border-right: 1px solid var(--df-rule); position: relative; min-width: 0; }
.section-rule { display: flex; align-items: center; gap: 12px; font-weight: 700; font-size: 11px;
  letter-spacing: 0.26em; text-transform: uppercase; color: var(--df-ink-2);
  padding: 12px 0; border-bottom: 1px solid var(--df-rule); margin-bottom: 18px; }
.section-rule::after { content: ""; flex: 1; height: 1px; background: var(--df-rule); }
.section-rule .tag { font-family: var(--sd-mono); font-weight: 500; font-size: 9.5px; letter-spacing: 0.18em;
  color: var(--sd-inc-core); border: 1px solid var(--sd-inc-brd); padding: 3px 8px; border-radius: 2px; }
.lead-slug { display: flex; align-items: baseline; gap: 14px; margin-bottom: 10px; flex-wrap: wrap; }
.lead-slug .id { font-size: 13px; font-weight: 700; color: var(--sd-inc-core); letter-spacing: 0.06em; }
.sev-badge { font-family: var(--sd-mono); font-size: 9.5px; font-weight: 700; letter-spacing: 0.16em;
  padding: 3px 8px; border-radius: 2px; }
.sev-badge.s1 { background: var(--sd-inc-arc); color: #fff; }
.sev-badge.s2 { background: transparent; color: var(--sd-inc-warn); border: 1px solid var(--sd-inc-warn); }
.chip { font-family: var(--sd-mono); font-size: 8.5px; font-weight: 600; letter-spacing: 0.1em;
  text-transform: uppercase; padding: 2.5px 7px; border-radius: 2px;
  border: 1px solid var(--df-rule-strong); color: var(--df-ink-3); }
.chip.exp { border-color: var(--sd-inc-brd); color: var(--sd-inc-core); }
.chip.expred { border-color: var(--sd-inc-arc); color: var(--sd-inc-arc); border-style: dashed; }
.chip.link { border-style: dotted; }
.lead-headwrap { position: relative; }
.lead-head { margin: 0 0 8px; font-weight: 750; font-size: clamp(24px, 2.6vw, 34px); line-height: 1.12;
  letter-spacing: -0.02em; max-width: 24ch; color: var(--df-ink); text-wrap: balance; }
.lead-standfirst { font-family: var(--df-serif); font-style: italic; font-size: 15.5px; color: var(--df-ink-2);
  line-height: 1.55; margin: 0 0 20px; max-width: 60ch; }
.lead-body { display: grid; grid-template-columns: minmax(0, 1fr) 208px; gap: 26px; position: relative; }
.lead-cols { column-count: 2; column-gap: 26px; column-rule: 1px solid var(--df-rule);
  font-family: var(--df-serif); font-size: 15px; line-height: 1.62; color: var(--df-ink-2); }
.lead-cols p { margin: 0 0 13px; break-inside: avoid-column; }
.lead-cols p:first-child::first-letter { font-family: var(--sd-font, inherit); font-weight: 800;
  font-size: 52px; line-height: 0.82; float: left; padding: 6px 10px 0 0; color: var(--sd-inc-core); }
.lead-cols .byline { font-family: var(--sd-mono); font-style: normal; font-size: 10px;
  letter-spacing: 0.18em; text-transform: uppercase; color: var(--df-ink-3); margin-bottom: 12px; }

/* red-ink inline annotations — the ink layer never intercepts clicks except the circled figure */
.ann { position: relative; display: inline-block; font-style: normal; color: var(--df-ink); }
.ann svg { position: absolute; overflow: visible; pointer-events: none; }
.ann path, .ann ellipse { fill: none; stroke: var(--sd-inc-arc); stroke-width: 2; stroke-linecap: round;
  stroke-dasharray: 120; stroke-dashoffset: 120; animation: tdf-ink 1.1s var(--sd-spring) forwards;
  animation-delay: var(--d, 1.4s); }
.ann-circle { cursor: pointer; padding: 0; }
.ann-circle svg { inset: -9px -12px; }
.ann-under svg { left: -2px; right: -2px; bottom: -7px; height: 9px; }
.ann:hover { color: var(--sd-inc-arc); }
span.ann[title] { cursor: help; }

/* key figures side column */
.figures { position: relative; padding-left: 6px; }
.figures-box { border: 1px solid var(--df-rule-strong); padding: 16px 14px; position: relative;
  background: var(--df-paper-hi); }
.figures-box h4 { font-size: 10px; font-weight: 700; letter-spacing: 0.24em; text-transform: uppercase;
  color: var(--df-ink-3); margin: 0 0 12px; }
.fig-row { display: flex; justify-content: space-between; align-items: baseline; gap: 8px;
  padding: 7px 0; border-bottom: 1px dotted var(--df-rule); }
.fig-row:last-child { border-bottom: none; }
.fig-row .k { font-family: var(--sd-mono); font-size: 9.5px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--df-ink-3); }
.fig-row .v { font-size: 13px; font-weight: 600; color: var(--df-ink); }
.fig-row .v.red { color: var(--sd-inc-arc); }
.fig-row .v.warn { color: var(--sd-inc-warn); }
.fig-row .v.live { color: var(--sd-inc-live); }
.fig-row .v.gold { color: var(--sd-inc-core); }
.margin-arrow { position: absolute; left: -46px; top: 6px; width: 46px; height: 70px; pointer-events: none; }
.margin-arrow path { fill: none; stroke: var(--sd-inc-arc); stroke-width: 2; stroke-linecap: round;
  stroke-linejoin: round; stroke-dasharray: 160; stroke-dashoffset: 160;
  animation: tdf-ink 1.2s var(--sd-spring) forwards; animation-delay: 2.4s; }
.margin-note { position: absolute; left: -4px; top: -26px; transform: rotate(-3deg);
  font-family: var(--df-serif); font-style: italic; font-size: 12.5px; color: var(--sd-inc-arc);
  white-space: nowrap; opacity: 0; animation: tdf-note 0.6s var(--sd-spring) forwards; animation-delay: 2.9s;
  pointer-events: none; }
@keyframes tdf-note { to { opacity: 1; } }

/* the chop stamp */
.stamp { position: absolute; top: -6px; right: 0; transform: rotate(6deg) scale(1.7); opacity: 0;
  border: 2.5px solid var(--sd-inc-arc); color: var(--sd-inc-arc); border-radius: 4px;
  font-family: var(--sd-mono); font-weight: 700; font-size: 11px; letter-spacing: 0.2em;
  padding: 7px 12px; text-transform: uppercase; cursor: pointer;
  mask-image: radial-gradient(circle at 30% 40%, black 92%, transparent 100%);
  -webkit-mask-image: radial-gradient(circle at 30% 40%, black 92%, transparent 100%);
  animation: tdf-stamp 0.45s cubic-bezier(0.2, 1.6, 0.4, 1) forwards; animation-delay: 1.1s;
  background: var(--sd-inc-arc-soft); }
@keyframes tdf-stamp { to { opacity: 0.92; transform: rotate(-4deg) scale(1); } }

/* pressure sparkline */
.pressure { margin-top: 18px; border-top: 1px solid var(--df-rule); padding-top: 12px; }
.pressure .cap { font-family: var(--sd-mono); font-size: 9.5px; letter-spacing: 0.18em;
  text-transform: uppercase; color: var(--df-ink-3); display: flex; justify-content: space-between; }
.pressure .cap b { color: var(--sd-inc-core); font-weight: 600; }
.spark { width: 100%; height: 44px; margin-top: 6px; }
.spark .line { fill: none; stroke: var(--sd-inc-core); stroke-width: 1.6; stroke-linejoin: round; }
.spark .area { fill: var(--df-goldwash); stroke: none; }
.spark .dot { fill: var(--sd-inc-core); }
.spark.flash .line { filter: drop-shadow(0 0 5px var(--sd-inc-core)); }
.spark.flash .dot { animation: tdf-ping 0.9s var(--sd-spring); }
@keyframes tdf-ping { 0% { r: 2.5; } 40% { r: 5; } 100% { r: 2.5; } }

/* second story */
.second-story { margin-top: 24px; padding-top: 16px; border-top: 3px double var(--df-rule-strong);
  display: grid; grid-template-columns: minmax(0, 1fr) 208px; gap: 26px; }
.second-story h3 { font-weight: 700; font-size: 19px; letter-spacing: -0.01em; line-height: 1.25;
  margin: 6px 0 8px; color: var(--df-ink); }
.second-story .txt { font-family: var(--df-serif); font-size: 14px; line-height: 1.6;
  color: var(--df-ink-2); margin: 0; }
.second-story .editors-note { margin-top: 12px; font-size: 12.5px; }
.paused-note { font-family: var(--sd-mono); font-size: 10px; letter-spacing: 0.14em;
  text-transform: uppercase; border: 1px dashed var(--df-rule-strong); color: var(--df-ink-3);
  padding: 8px 10px; display: inline-block; }
.overdue-flag { display: inline-flex; align-items: center; gap: 7px; margin-top: 12px;
  font-family: var(--sd-mono); font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
  color: var(--sd-inc-arc); animation: tdf-overdue 1.6s ease-in-out infinite; }
@keyframes tdf-overdue { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }

/* ░░ wires rail ░░ */
.wires { padding: 26px 0 26px 26px; display: flex; flex-direction: column; min-width: 0; }
.wires-head { display: flex; align-items: center; justify-content: space-between; font-size: 11px;
  font-weight: 700; letter-spacing: 0.26em; text-transform: uppercase; color: var(--df-ink-2);
  border-bottom: 1px solid var(--df-rule); padding-bottom: 10px; margin-bottom: 4px; }
.wires-head .live { font-family: var(--sd-mono); font-size: 9px; color: var(--sd-inc-live);
  letter-spacing: 0.18em; display: inline-flex; align-items: center; gap: 6px; }
.wires-head .live::before { content: ""; width: 6px; height: 6px; border-radius: 50%;
  background: var(--sd-inc-live); animation: tdf-press 2s infinite; }
.wire-list { display: flex; flex-direction: column-reverse; }
.wire { padding: 11px 0; border-bottom: 1px dotted var(--df-rule); font-family: var(--df-serif);
  font-size: 13.5px; line-height: 1.55; color: var(--df-ink-2); animation: tdf-wire 0.5s var(--sd-spring); }
.wire.dim { color: var(--df-ink-3); font-style: italic; }
@keyframes tdf-wire { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
.wire .t { font-size: 10px; font-weight: 600; letter-spacing: 0.1em; color: var(--sd-inc-core); margin-right: 8px; }
.wire .id { font-size: 11px; font-weight: 600; color: var(--df-ink); margin-right: 2px; }
.wire.red .t, .wire.red .id { color: var(--sd-inc-arc); }
.wire .caret { display: inline-block; width: 7px; height: 13px; background: var(--sd-inc-core);
  vertical-align: -2px; margin-left: 2px; animation: tdf-caret 1s steps(1) infinite; }
@keyframes tdf-caret { 50% { opacity: 0; } }
.wires-foot { margin-top: auto; padding-top: 14px; font-family: var(--sd-mono); font-size: 9.5px;
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--df-ink-3); line-height: 1.8; }

/* ░░ exposure choropleth + intel row ░░ */
.data-row { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr) minmax(0, 1fr);
  gap: 26px; padding: 24px 0; border-bottom: 1px solid var(--df-rule); }
.databox h4 { font-size: 10px; font-weight: 700; letter-spacing: 0.24em; text-transform: uppercase;
  color: var(--df-ink-3); margin: 0 0 14px; display: flex; justify-content: space-between;
  align-items: baseline; gap: 8px; }
.databox h4 .sub { font-family: var(--sd-mono); font-weight: 500; letter-spacing: 0.1em;
  color: var(--sd-inc-core); font-size: 9.5px; text-transform: none; text-align: right; }
.choro { display: grid; grid-template-columns: repeat(6, 1fr); grid-auto-rows: 52px; gap: 5px; }
.choro button { position: relative; border-radius: 3px; border: 1px solid transparent;
  display: flex; flex-direction: column; justify-content: space-between; padding: 7px 9px;
  text-align: left; transition: transform 0.3s var(--sd-spring), border-color 0.2s; }
.choro button:hover { transform: translateY(-2px); border-color: var(--sd-inc-brd); }
.choro button[aria-pressed="true"] { border-color: var(--sd-inc-core); }
.choro .cl { font-family: var(--sd-mono); font-size: 8.5px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--df-ink-2); }
.choro .cn { font-size: 17px; font-weight: 700; color: var(--df-ink); }
.choro .b-rev { grid-column: span 3; background: color-mix(in srgb, var(--sd-inc-core) 26%, transparent); }
.choro .b-pub { grid-column: span 2; background: color-mix(in srgb, var(--sd-inc-core) 16%, transparent); }
.choro .b-una { grid-column: span 1; background: var(--sd-inc-arc-soft); border: 1px dashed var(--sd-inc-arc); }
.choro .b-com { grid-column: span 3; background: color-mix(in srgb, var(--sd-inc-core) 10%, transparent); }
.choro .b-sec { grid-column: span 2; background: color-mix(in srgb, var(--sd-inc-arc) 10%, transparent); }
.choro .b-usr { grid-column: span 1; background: transparent; border: 1px solid var(--df-rule-strong); }
.choro .b-una .cl, .choro .b-una .cn { color: var(--sd-inc-arc); }
.users-line { margin-top: 12px; font-family: var(--sd-mono); font-size: 11px; letter-spacing: 0.1em;
  color: var(--df-ink-2); display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.users-line .big { font-size: 19px; font-weight: 700; color: var(--df-ink); }
.users-line .red { color: var(--sd-inc-arc); }

/* MI promotion notice */
.correction { border: 1.5px solid var(--sd-inc-arc); padding: 16px 16px 14px; position: relative;
  background: var(--sd-inc-arc-soft); }
.correction .rub { position: absolute; top: -9px; left: 12px; background: var(--df-paper);
  padding: 0 8px; font-family: var(--sd-mono); font-size: 9.5px; font-weight: 700;
  letter-spacing: 0.22em; color: var(--sd-inc-arc); text-transform: uppercase; }
.correction .slug2 { font-family: var(--sd-mono); font-size: 11.5px; font-weight: 700;
  color: var(--df-ink); margin: 0 0 6px; }
.correction .slug2 .id { color: var(--sd-inc-core); }
.correction blockquote { font-family: var(--df-serif); font-style: italic; font-size: 13.5px;
  line-height: 1.55; color: var(--df-ink-2); border-left: 2px solid var(--sd-inc-arc);
  padding-left: 10px; margin: 8px 0 10px; }
.correction .meta { font-family: var(--sd-mono); font-size: 9.5px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--df-ink-3); margin: 0; }
.correction .meta .up { color: var(--sd-inc-arc); }
.correction .acts { display: flex; gap: 8px; margin-top: 12px; align-items: center; flex-wrap: wrap; }
.mini-verb { font-family: var(--sd-mono); font-size: 9.5px; font-weight: 600; letter-spacing: 0.14em;
  text-transform: uppercase; border: 1px solid var(--df-rule-strong); padding: 6px 11px;
  border-radius: 2px; color: var(--df-ink-2);
  transition: transform 0.25s var(--sd-spring), color 0.15s, border-color 0.15s; }
.mini-verb:hover { transform: translateY(-1px); color: var(--sd-inc-core); border-color: var(--sd-inc-brd); }
.mini-verb.red { color: var(--sd-inc-arc); border-color: var(--sd-inc-arc); }
.awaiting { font-family: var(--sd-mono); font-size: 9px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--sd-inc-warn); border: 1px dashed var(--sd-inc-warn);
  padding: 5px 9px; border-radius: 2px; }

/* archive clipping */
.clipping { border: 1px solid var(--df-rule-strong); background: var(--df-paper-hi); padding: 16px;
  transform: rotate(-0.4deg); position: relative; }
.clipping::before { content: "FROM THE ARCHIVE"; position: absolute; top: -9px; left: 12px;
  background: var(--df-paper); padding: 0 8px; font-family: var(--sd-mono); font-size: 9.5px;
  font-weight: 700; letter-spacing: 0.22em; color: var(--df-ink-3); }
.clipping .rep { font-family: var(--sd-mono); font-size: 10px; font-weight: 700;
  letter-spacing: 0.12em; color: var(--sd-inc-arc); margin: 0 0 8px; text-transform: uppercase; }
.clipping .rep.dim { color: var(--df-ink-3); }
.clipping h5 { font-weight: 700; font-size: 15px; margin: 0 0 6px; color: var(--df-ink); }
.clipping .id { font-size: 11px; color: var(--sd-inc-core); }
.clipping p { font-family: var(--df-serif); font-size: 13px; line-height: 1.55; color: var(--df-ink-2);
  margin: 6px 0 10px; }
.clipping a { font-family: var(--sd-mono); font-size: 10px; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--sd-inc-core); text-decoration: none;
  border-bottom: 1px solid var(--sd-inc-brd); padding-bottom: 1px; cursor: pointer; }
.clipping a:hover { color: var(--sd-inc-hi); }

/* ░░ responsive ░░ */
@media (max-width: 1380px) { .indices { grid-template-columns: repeat(5, 1fr); } }
@media (max-width: 1180px) {
  .spread { grid-template-columns: 1fr; }
  .lead { border-right: none; padding-right: 0; }
  .wires { padding-left: 0; border-top: 1px solid var(--df-rule); }
  .data-row { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 800px) {
  .data-row { grid-template-columns: 1fr; }
  .lead-body, .second-story { grid-template-columns: 1fr; }
  .margin-arrow, .margin-note { display: none; }
}

/* ═════ LIGHT THEME OVERRIDES ═════ */
[data-theme="light"] .cta.primary { color: #fff8ec; }
[data-theme="light"] .sev-badge.s1 { color: #fff8ec; }
[data-theme="light"] .press-dot,
[data-theme="light"] .wires-head .live::before { box-shadow: 0 0 0 0 var(--sd-inc-live-soft); }

/* ░░ reduced motion — one static designed frame ░░ */
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .press-dot,
  html:not([data-cinematic="on"]) .wires-head .live::before,
  html:not([data-cinematic="on"]) .wire,
  html:not([data-cinematic="on"]) .wire .caret,
  html:not([data-cinematic="on"]) .overdue-flag,
  html:not([data-cinematic="on"]) .spark.flash .dot { animation: none !important; }
  html:not([data-cinematic="on"]) .headline .w { opacity: 1; transform: none; transition: none; }
  html:not([data-cinematic="on"]) .index-figure ellipse,
  html:not([data-cinematic="on"]) .ann path,
  html:not([data-cinematic="on"]) .ann ellipse,
  html:not([data-cinematic="on"]) .margin-arrow path { animation: none; stroke-dashoffset: 0; }
  html:not([data-cinematic="on"]) .stamp { animation: none; opacity: 0.92; transform: rotate(-4deg) scale(1); }
  html:not([data-cinematic="on"]) .margin-note { animation: none; opacity: 1; }
  html:not([data-cinematic="on"]) .wire .caret { display: none; }
}
</style>
