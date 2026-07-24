<template>
  <section class="pat">
    <!-- ═══ HERO — the Atrium ═══ -->
    <SdPirAtriumHero :stats="stats" :docket="docket" :owed="owed" :counts="actionCounts"
      :last-fan="lastFan" :arrivals="arrivalTick" @open-dossier="openDossier" @go="scrollTo" />

    <!-- ═══ CHIP RAIL ═══ -->
    <nav class="pat-rail sd-mono">
      <button v-for="c in railChips" :key="c.id" class="pchip" :class="{ on: railOn === c.id }" @click="scrollTo(c.id)">
        {{ c.label }} <span v-if="c.n != null" class="ct">{{ c.n }}</span>
      </button>
      <button class="pchip ghost" :class="{ spin: loading }" title="Refresh the desk" @click="refreshAll(false)"><RefreshCw :size="12" /></button>
      <span class="rail-note">FOUR-EYES ENFORCED · PUBLISH IS ADMIN-ONLY</span>
    </nav>

    <!-- ═══ 01 DOCKET ═══ -->
    <section :ref="el => (secEls.docket = el)" class="pat-sec" id="pat-docket">
      <div class="shead">
        <span class="se sd-mono">01 · REVIEW DOCKET</span><h2>Awaiting a second signature</h2>
        <div class="rule" /><span class="snote sd-mono">CLICK A ROW TO READ THE FULL DOSSIER</span>
      </div>
      <TransitionGroup name="pat-drk" tag="div" class="drow-l">
        <button v-for="p in docket" :key="p.pir_id" class="pat-glass drk" @click="openDossier(p)">
          <span class="spine" :class="'s' + p.sev" />
          <span class="drk-main">
            <span class="drk-top sd-mono">{{ p.report_number }} · {{ p.ticket_number }}
              <span v-if="p.team_name" class="svc">{{ p.team_name }}</span>
              <span class="sev sd-mono" :class="'s' + p.sev">SEV{{ p.sev }}</span></span>
            <h4>{{ p.title || p.subject }}</h4>
            <span class="drk-meta"><span class="ava">{{ initials(p.created_by_name) }}</span> {{ p.created_by_name || '—' }}
              <template v-if="isMine(p)"><b class="you">(you)</b></template>
              · submitted {{ shortAt(p.submitted_at) }} · in review {{ ageShort(p.submitted_at) }}</span>
          </span>
          <span class="drk-r">
            <span class="state sd-mono" :class="{ four: fourEyesRow(p) }">{{ fourEyesRow(p) ? 'FOUR-EYES · NOT YOURS TO SIGN' : 'AWAITING SIGN-OFF' }}</span>
            <span class="gbtn sd-mono">READ DOSSIER →</span>
          </span>
        </button>
      </TransitionGroup>
      <div v-if="!loading && !docket.length" class="pat-empty">Nothing awaiting a second signature. The docket is clear.</div>
    </section>

    <!-- ═══ 02 PUBLISH DESK ═══ -->
    <section :ref="el => (secEls.publish = el)" class="pat-sec" id="pat-publish">
      <div class="shead">
        <span class="se sd-mono">02 · PUBLISH DESK</span><h2>Sealed &amp; ready to distribute</h2>
        <div class="rule" /><span class="snote sd-mono">PUBLISHING FANS OUT TO WATCHERS · ROSTER · TEAM LEADS</span>
      </div>
      <div class="pub-grid">
        <article v-for="p in approved" :key="p.pir_id" class="pat-glass pubc"
          :class="{ publishing: publishingId === p.pir_id, gone: goneIds.has(p.pir_id) }"
          :ref="el => (pubEls[p.pir_id] = el)">
          <span class="ringfx" />
          <div class="drk-top sd-mono">{{ p.report_number }} · {{ p.ticket_number }}
            <span v-if="p.team_name" class="svc">{{ p.team_name }}</span>
            <span class="sev sd-mono" :class="'s' + p.sev">SEV{{ p.sev }}</span></div>
          <h4>{{ p.title || p.subject }}</h4>
          <div class="sealline sd-mono"><CircleCheck :size="14" /> SEALED{{ p.approved_at ? ' · ' + shortAt(p.approved_at).toUpperCase() : '' }}</div>
          <div class="dist">
            <div class="dl sd-mono">DISTRIBUTION PREVIEW · ON PUBLISH</div>
            <div class="drow">
              <div class="dr"><div class="dn">{{ watcherCounts[p.pir_id] ?? '…' }}</div><div class="dt sd-mono">WATCHERS</div></div>
              <div class="dr"><div class="dn">{{ rosterCount(p) }}</div><div class="dt sd-mono">RESPONSE ROSTER</div></div>
              <div class="dr"><div class="dn">1+</div><div class="dt sd-mono">TEAM LEADS</div></div>
            </div>
            <div class="dtotal"><span><b class="tot">{{ previewTotal(p) }}+ recipients</b> on the fan-out list</span></div>
          </div>
          <div class="pverbs">
            <button class="abtn sd-mono" :disabled="busy" @click="publishRec(p)">PUBLISH &amp; DISTRIBUTE</button>
            <button class="gbtn real sd-mono" @click="openDossier(p)">READ DOSSIER</button>
          </div>
        </article>
        <div v-if="!approved.length" class="pat-glass pub-empty">
          Nothing sealed and waiting. Approvals land here for the publish ceremony.
        </div>
      </div>
      <div class="canonh sd-mono">PUBLISHED CANON · MOST RECENT FIRST</div>
      <div class="canon">
        <button v-for="p in published" :key="p.pir_id" class="pat-glass ctile" :class="{ new: p.pir_id === newCanonId }"
          @click="openDossier(p)">
          <div class="cid sd-mono">{{ p.report_number }} · PUBLISHED {{ shortDate(p.published_at).toUpperCase() }}</div>
          <div class="ctt">{{ p.title || p.subject }}</div>
          <div class="cm sd-mono"><span>{{ p.team_name || p.ticket_number }}</span><span>SEV{{ p.sev }}</span></div>
        </button>
        <div v-if="!published.length" class="canon-empty sd-mono">THE CANON BEGINS WITH THE FIRST PUBLISHED RECORD.</div>
      </div>
    </section>

    <!-- ═══ 03 ANALYTICS ═══ -->
    <section :ref="el => (secEls.analytics = el)" class="pat-sec" id="pat-analytics">
      <div class="shead">
        <span class="se sd-mono">03 · PROGRAM ANALYTICS</span><h2>Is the program holding?</h2>
        <div class="rule" /><span class="snote sd-mono">LIVE FROM THE SEALED BOARD</span>
      </div>
      <div class="ana">
        <div class="pat-glass anac">
          <div class="at sd-mono">COVERAGE · 90D</div>
          <div class="av">{{ coverage }}<em>%</em></div>
          <div class="as">of terminal SEV1/2 closures carry a review</div>
          <svg viewBox="0 0 150 96" class="anaviz">
            <circle class="arcTrack" cx="75" cy="88" r="62" stroke-width="8" stroke-dasharray="194.8 194.8" transform="rotate(180 75 88)" />
            <circle class="arcVal" cx="75" cy="88" r="62" stroke="url(#pat-ag)" stroke-width="8"
              stroke-dasharray="389.6" :style="{ strokeDashoffset: 389.6 - (coverage / 100) * 194.8 }" transform="rotate(180 75 88)" />
            <defs><linearGradient id="pat-ag" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stop-color="#b45309" /><stop offset="1" stop-color="#f5c56b" /></linearGradient></defs>
          </svg>
        </div>
        <div class="pat-glass anac">
          <div class="at sd-mono">REVIEW LATENCY</div>
          <div class="av">{{ medianH }}<em>h</em></div>
          <div class="as">median submit → seal · 30d · target 48h</div>
          <div class="latbar">
            <div class="lb-track"><i :style="{ width: Math.min(100, (medianH / 96) * 100) + '%' }"
              :class="{ hot: medianH > 48 }" /><span class="lb-target" :style="{ left: (48 / 96) * 100 + '%' }" /></div>
            <div class="lb-scale sd-mono"><span>0</span><span>48H TARGET</span><span>96h</span></div>
          </div>
        </div>
        <div class="pat-glass anac">
          <div class="at sd-mono">PUBLISHED · 30D</div>
          <div class="av">{{ stats?.published_30d ?? 0 }}</div>
          <div class="as">records distributed to the org canon</div>
          <div class="pubmeta sd-mono">
            <span><b>{{ stats?.meetings_upcoming ?? 0 }}</b> REVIEW MEETINGS SCHEDULED</span>
            <span><b>{{ stats?.approved ?? 0 }}</b> SEALED · AWAITING PUBLISH</span>
          </div>
        </div>
        <div class="pat-glass anac">
          <div class="at sd-mono">ACTION FOLLOW-THROUGH</div>
          <div class="av">{{ followPct }}<em>%</em></div>
          <div class="as">register items closed · approved + published reviews</div>
          <div class="fbar">
            <div class="sbar big">
              <i class="sdone" :style="{ width: seg.done + '%' }" /><i class="sprog" :style="{ width: seg.prog + '%' }" />
              <i class="sopen" :style="{ width: seg.open + '%' }" /><i class="sovd" :style="{ width: seg.ovd + '%' }" />
            </div>
            <div class="slegend sd-mono">
              <span><i class="lg-done" />DONE {{ actionCounts?.done ?? 0 }}</span>
              <span><i class="lg-prog" />IN PROG {{ actionCounts?.in_progress ?? 0 }}</span>
              <span><i class="lg-open" />OPEN {{ openOnly }}</span>
              <span><i class="lg-ovd" />OVERDUE {{ actionCounts?.overdue ?? 0 }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ 04 ACTION GOVERNANCE ═══ -->
    <section :ref="el => (secEls.actions = el)" class="pat-sec" id="pat-actions">
      <div class="shead">
        <span class="se sd-mono">04 · ACTION GOVERNANCE</span><h2>Follow-through, org-wide</h2>
        <div class="rule" /><span class="snote sd-mono">OVERDUE FIRST · {{ actionRows.length }} ITEMS ON THE REGISTER</span>
      </div>
      <div class="pat-glass atable">
        <div class="atr head sd-mono"><span>ACTION</span><span>DESCRIPTION</span><span>TYPE</span><span>OWNER</span><span>SOURCE PIR</span><span>TARGET</span><span>STATUS</span></div>
        <div v-for="a in actionRows" :key="(a.pir_id || '') + a.kind + (a.aid || a.index)" class="atr">
          <span class="aid sd-mono">{{ a.aid || '—' }}</span>
          <span class="atxt">{{ a.action }}</span>
          <span class="atype sd-mono" :class="a.kind === 'corrective' ? 'corr' : 'prev'">{{ a.kind === 'corrective' ? 'CORRECTIVE' : 'PREVENTIVE' }}</span>
          <span class="ownc"><span class="ava">{{ initials(a.owner_name) }}</span>{{ (a.owner_name || '—').split(' ')[0] }}</span>
          <span class="srcp sd-mono link" role="button" tabindex="0" @click="openByPirId(a.pir_id)"
            @keydown.enter="openByPirId(a.pir_id)">{{ a.report_number }}</span>
          <span class="due">{{ a.target_date || '—' }}</span>
          <span class="ast-cell">
            <span class="astat sd-mono" :class="a.overdue && a.status !== 'done' ? 'ovd' : a.status === 'done' ? 'done' : a.status === 'in_progress' ? 'prog' : 'open'">
              {{ a.overdue && a.status !== 'done' ? 'OVERDUE' : a.status === 'in_progress' ? 'IN PROGRESS' : a.status.toUpperCase() }}</span>
            <button v-if="a.overdue && a.status !== 'done'" class="gbtn real rmind sd-mono" :disabled="busy"
              @click="remind(a)">REMIND</button>
          </span>
        </div>
        <div v-if="!actionRows.length" class="pat-empty in-table">No open follow-through on the register.</div>
      </div>
    </section>

    <!-- ═══ 05 OWED ENFORCEMENT ═══ -->
    <section :ref="el => (secEls.owed = el)" class="pat-sec" id="pat-owed">
      <div class="shead">
        <span class="se sd-mono">05 · OWED ENFORCEMENT</span><h2>Teams owing a review</h2>
        <div class="rule" /><span class="snote sd-mono">TERMINAL SEV1/2 WITHOUT A PIR · OLDEST FIRST</span>
      </div>
      <div class="ladder">
        <div v-for="o in owed" :key="o.ticket_id" class="pat-glass lrow">
          <div class="lteam"><div class="tn">{{ o.team_name || 'Unassigned team' }}</div>
            <div class="tl sd-mono">{{ o.incident_commander_name ? 'CMDR · ' + o.incident_commander_name.toUpperCase() : (o.assigned_agent_name ? 'OWNER · ' + o.assigned_agent_name.toUpperCase() : 'UNOWNED') }}</div></div>
          <div class="linc">
            <div class="li sd-mono">{{ o.ticket_number }} <span class="sev sd-mono" :class="'s' + o.sev">SEV{{ o.sev }}</span></div>
            <div class="lt">{{ o.subject }}</div></div>
          <div class="agebar"><div class="ab"><i :style="ageBarStyle(o)" /></div>
            <div class="al sd-mono"><span>CLOSED {{ o.age_days ?? 0 }}D AGO</span>
              <span>{{ (o.age_days ?? 0) >= 14 ? 'ESCALATED · ADMIN' : (o.age_days ?? 0) >= 7 ? 'ESCALATED · LEAD' : 'WITHIN GRACE' }}</span></div></div>
          <div class="aged" :class="{ hot: (o.age_days ?? 0) >= 14 }">{{ o.age_days ?? 0 }}<em>d</em></div>
          <button class="nudge sd-mono" :class="{ sent: nudged.has(o.ticket_id) }" :disabled="busy || nudged.has(o.ticket_id)"
            @click="nudgeOwed(o)">{{ nudged.has(o.ticket_id) ? 'NUDGED ✓ · 24H THROTTLE' : 'NUDGE TEAM' }}</button>
        </div>
        <div v-if="!owed.length" class="pat-empty ok">No review debt anywhere on the desk. The program is caught up.</div>
      </div>
      <div class="escnote sd-mono"><TriangleAlert :size="13" />
        THE PIR SWEEP NUDGES COMMANDERS AUTOMATICALLY AFTER 3 DAYS · MANUAL NUDGES ARE THROTTLED TO ONE PER 24H PER INCIDENT</div>
    </section>

    <footer class="pat-foot sd-mono">
      <span><span class="fdot" />FOURCONNECT SUPPORT DESK · POST-INCIDENT PROGRAM</span>
      <span>RECORD OF REVIEW · FOUR-EYES ENFORCED</span>
      <span v-if="stats">{{ stats.published }} PUBLISHED ALL-TIME · COVERAGE {{ coverage }}%</span>
    </footer>

    <!-- ═══ DOSSIER SHEET ═══ -->
    <SdPirDossierSheet ref="sheetRef" :open="sheetOpen" :pir="activeDoc" :me="me" :is-admin="true" :busy="busy"
      @close="sheetOpen = false" @approve="onApprove" @reject="onReject"
      @export-pdf="onPdf" @open-incident="id => $emit('open', id)" />
  </section>
</template>

<script setup>
/* SdIncPirApprovalsSection — ADMIN desk "THE PARALLAX ATRIUM" (user-picked artifact C7,
   ported 1:1). Governance over the sealed PIR board: parallax bento hero, review docket
   with the dossier sheet (seal-draw + fly-away approve ceremony), publish desk with the
   particle fan-out distribution ceremony + published canon, live program analytics,
   org-wide action governance, and the owed-enforcement ladder with 24h-throttled nudges. */
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import { RefreshCw, CircleCheck, TriangleAlert } from 'lucide-vue-next'
import {
  fetchMe, fetchPirBoard, getPir, approvePir, rejectPir, publishPir,
  exportPirPdf, listIncidentActions, listTicketWatchers, nudgePirReview, remindPirAction,
} from '@/composables/useSupportDesk'
import SdPirAtriumHero from '../components/SdPirAtriumHero.vue'
import SdPirDossierSheet from '../drawers/SdPirDossierSheet.vue'

defineProps({ panel: { type: String, default: 'admin' } })
const emit = defineEmits(['go', 'open', 'changed', 'new'])

const toast = useToast()
const route = useRoute()

const me = ref(null)
const busy = ref(false)
const loading = ref(false)
const stats = ref(null)
const docket = ref([])
const approved = ref([])
const published = ref([])
const owed = ref([])
const actionRows = ref([])
const actionCounts = ref(null)
const watcherCounts = reactive({})
const sheetOpen = ref(false)
const activeDoc = ref(null)
const sheetRef = ref(null)
const publishingId = ref(null)
const goneIds = ref(new Set())
const newCanonId = ref(null)
const nudged = ref(new Set())
const lastFan = ref(null)
const arrivalTick = ref(0)
const railOn = ref('docket')
const secEls = reactive({})
const pubEls = reactive({})
let poll = null
let knownDocket = new Set()

/* ── derived ── */
const coverage = computed(() => Math.round(stats.value?.coverage_pct ?? 0))
const medianH = computed(() => Math.round(stats.value?.median_review_hours_30d ?? 0))
const followPct = computed(() => {
  const c = actionCounts.value
  const total = (c?.open ?? 0) + (c?.done ?? 0)
  return total ? Math.round((c.done / total) * 100) : 0
})
const openOnly = computed(() => Math.max(0, (actionCounts.value?.open ?? 0) - (actionCounts.value?.in_progress ?? 0)))
const seg = computed(() => {
  const c = actionCounts.value || {}
  const done = c.done ?? 0, prog = c.in_progress ?? 0, ovd = c.overdue ?? 0
  const open = Math.max(0, (c.open ?? 0) - prog - ovd)
  const total = Math.max(1, done + prog + open + ovd)
  return { done: (done / total) * 100, prog: (prog / total) * 100, open: (open / total) * 100, ovd: (ovd / total) * 100 }
})
const railChips = computed(() => [
  { id: 'docket', label: 'DOCKET', n: stats.value?.in_review ?? 0 },
  { id: 'publish', label: 'PUBLISH DESK', n: stats.value?.approved ?? 0 },
  { id: 'analytics', label: 'ANALYTICS', n: null },
  { id: 'actions', label: 'ACTIONS', n: (actionCounts.value?.open ?? 0) },
  { id: 'owed', label: 'OWED', n: stats.value?.owed ?? 0 },
])

/* ── data cycle ── */
const refreshAll = async (silent = true) => {
  if (!silent) loading.value = true
  try {
    const [rev, app, pub, owe, act] = await Promise.all([
      fetchPirBoard({ lens: 'in_review', limit: 20, sort: 'submitted', sort_dir: 'asc' }),
      fetchPirBoard({ lens: 'approved', limit: 10 }),
      fetchPirBoard({ lens: 'published', limit: 10 }),
      fetchPirBoard({ lens: 'owed', limit: 10 }),
      listIncidentActions({ limit: 30 }),
    ])
    const rows = rev.items || []
    if (knownDocket.size && rows.some(r => !knownDocket.has(String(r.pir_id)))) arrivalTick.value++
    rows.forEach(r => knownDocket.add(String(r.pir_id)))
    docket.value = rows
    stats.value = rev.stats || null
    approved.value = (app.items || []).filter(p => !goneIds.value.has(p.pir_id))
    published.value = pub.items || []
    owed.value = owe.items || []
    actionRows.value = act.items || []
    actionCounts.value = act.counts || null
    approved.value.forEach((p) => {
      if (watcherCounts[p.pir_id] == null) {
        listTicketWatchers(p.ticket_id)
          .then(w => { watcherCounts[p.pir_id] = (w.items || w || []).length ?? 0 })
          .catch(() => { watcherCounts[p.pir_id] = 0 })
      }
    })
  } catch { /* keep last good desk */ }
  finally { loading.value = false }
}

/* ── dossier ── */
const openDossier = async (row) => { openByPirId(row.pir_id) }
const openByPirId = async (id) => {
  if (!id) return
  try {
    activeDoc.value = await getPir(id)
    sheetOpen.value = true
  } catch { toast.error('Could not open that dossier.') }
}
const onApprove = async ({ pir }) => {
  busy.value = true
  try {
    await approvePir(pir.id, {})
    sheetOpen.value = false
    goneIds.value = new Set(goneIds.value)
    toast.success(`${pir.report_number} approved & sealed — moved to the Publish Desk.`)
    await refreshAll()
  } catch (e) {
    sheetOpen.value = false
    toast.error(e?.response?.data?.detail || 'Approve refused.')
    refreshAll()
  } finally { busy.value = false }
}
const onReject = async ({ pir, note }) => {
  busy.value = true
  try {
    await rejectPir(pir.id, { note })
    await sheetRef.value?.playRetreat?.()
    sheetOpen.value = false
    toast.warning(`${pir.report_number} returned to draft — the note travels back to ${pir.created_by_name || 'the author'}.`)
    refreshAll()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Reject refused.') }
  finally { busy.value = false }
}
const onPdf = async (pir) => {
  try {
    const blob = await exportPirPdf(pir.id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${pir.report_number}.pdf`; a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    toast.error(e?.response?.status === 503
      ? 'PDF engine offline on the server (GTK runtime missing).' : 'PDF export failed.')
  }
}

/* ── publish ceremony: particle fan-out → card gone → canon tile ── */
const RM = typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  && document.documentElement.getAttribute('data-cinematic') !== 'on'
const publishRec = async (p) => {
  busy.value = true
  publishingId.value = p.pir_id
  try {
    const res = await publishPir(p.pir_id)
    const recipients = res?.distribution?.recipients ?? 0
    lastFan.value = { recipients, report: p.report_number }
    if (!RM) {
      const card = pubEls[p.pir_id]
      if (card) {
        const cr = card.getBoundingClientRect()
        const targets = [...card.querySelectorAll('.dr')]
        const cx = cr.left + cr.width / 2, cy = cr.top + cr.height * 0.42
        for (let i = 0; i < 22; i++) {
          const d = document.createElement('div')
          d.className = 'pat-pfx'
          d.style.left = cx + 'px'; d.style.top = cy + 'px'
          document.body.appendChild(d)
          const t = (targets[i % Math.max(1, targets.length)] || card).getBoundingClientRect()
          const tx = t.left + t.width * (0.2 + Math.random() * 0.6) - cx
          const ty = t.top + t.height / 2 - cy
          requestAnimationFrame(() => setTimeout(() => {
            d.style.transform = `translate(${tx}px, ${ty}px) scale(${0.4 + Math.random() * 0.7})`
            d.style.opacity = '0'
          }, 40 + i * 22))
          setTimeout(() => d.remove(), 1500 + i * 22)
        }
      }
      await new Promise(r => setTimeout(r, 1250))
    }
    goneIds.value = new Set([...goneIds.value, p.pir_id])
    newCanonId.value = p.pir_id
    toast.success(`${p.report_number} published — ${recipients} recipients notified.`)
    await new Promise(r => setTimeout(r, RM ? 0 : 550))
    await refreshAll()
    goneIds.value = new Set()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Publish refused.') }
  finally { busy.value = false; publishingId.value = null }
}

/* ── nudges ── (the owed incident is TERMINAL, so this uses the dedicated PIR nudge
   endpoints — the generic /nudge-owner 409s closed tickets. A 'throttled' result is a
   benign 200 no-op; only a real 4xx keeps the button live so it never lies about sending.) */
const nudgeOwed = async (o) => {
  busy.value = true
  try {
    const res = await nudgePirReview(o.ticket_id, { message: 'This closed incident still owes a post-incident review.' })
    nudged.value = new Set([...nudged.value, o.ticket_id])
    if (res?.status === 'throttled') toast.info(res.detail || 'Already nudged inside the 24h throttle.')
    else toast.info(`Nudge dispatched to ${res?.recipients ?? 0} — ${o.ticket_number} owes a review.`)
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Nudge refused.')
  } finally { busy.value = false }
}
const remind = async (a) => {
  busy.value = true
  try {
    const res = await remindPirAction(a.pir_id, a.kind, a.index, { aid: a.aid })
    if (res?.status === 'throttled') toast.info(res.detail || 'Already reminded inside the 24h throttle.')
    else toast.info(`Reminder dispatched to ${a.owner_name || 'the action owner'} — ${a.report_number}.`)
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Reminder refused.')
  } finally { busy.value = false }
}

/* ── misc ── */
const isMine = (p) => me.value && String(p.created_by_id || '') === String(me.value.id)
const fourEyesRow = () => false   // admin desk: superuser is four-eyes exempt (backend rule)
const rosterCount = (p) => new Set([p.incident_commander_id, p.assigned_agent_id].filter(Boolean).map(String)).size
const previewTotal = (p) => (watcherCounts[p.pir_id] ?? 0) + rosterCount(p) + 1
const initials = (n) => (n || '—').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
const shortAt = (iso) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) }
  catch { return String(iso).slice(0, 16).replace('T', ' ') }
}
const shortDate = (iso) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) }
  catch { return String(iso).slice(0, 10) }
}
const ageShort = (iso) => {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  const d = Math.floor(ms / 86400000); const h = Math.floor((ms % 86400000) / 3600000)
  return d > 0 ? `${d}d ${h}h` : `${h}h`
}
const ageBarStyle = (o) => {
  const pct = Math.min(100, ((o.age_days ?? 0) / 21) * 100)
  const col = (o.age_days ?? 0) >= 14 ? 'var(--sd-pir-red)' : (o.age_days ?? 0) >= 7 ? '#d97706' : 'var(--sd-pir-core)'
  return { width: pct + '%', background: `linear-gradient(90deg, var(--sd-pir-core), ${col})` }
}
const scrollTo = (id) => {
  railOn.value = id
  secEls[id]?.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' })
}

onMounted(async () => {
  me.value = await fetchMe()
  await refreshAll(false)
  poll = setInterval(() => { if (!document.hidden && !sheetOpen.value) refreshAll(true) }, 60000)
  // deep links: ?focus=<pir id> opens the dossier; legacy ?status scrolls to the
  // zone that shows that stage (draft/in_review → the review docket; approved/
  // published → the publish desk & canon) so a dashboard tile never lands dead.
  if (route.query.focus) openByPirId(String(route.query.focus))
  else {
    const STATUS_ZONE = { draft: 'docket', in_review: 'docket', approved: 'publish', published: 'publish' }
    const zone = STATUS_ZONE[String(route.query.status || '')]
    if (zone) scrollTo(zone)
  }
})
onBeforeUnmount(() => clearInterval(poll))
</script>

<style scoped>
/* ── THE PARALLAX ATRIUM token plate (C7) — scoped to the desk, both themes ── */
.pat {
  --pat-panel: rgba(255, 243, 220, 0.045); --pat-panel2: rgba(255, 243, 220, 0.07); --pat-panel3: rgba(255, 243, 220, 0.10);
  --pat-line: rgba(232, 176, 75, 0.17); --pat-line-soft: rgba(232, 176, 75, 0.09); --pat-hair: rgba(243, 234, 217, 0.08);
  --pat-ink2: #b3a288; --pat-ink3: #7d6f58; --pat-amber-ink: #e8b04b;
  --pat-shadow: 0 30px 70px rgba(0, 0, 0, 0.55); --pat-shadow-soft: 0 14px 40px rgba(0, 0, 0, 0.4);
  --pat-glow: 0 0 44px rgba(232, 176, 75, 0.13); --pat-spot: rgba(245, 197, 107, 0.10);
  position: relative; display: flex; flex-direction: column;
}
[data-theme="light"] .pat {
  --pat-panel: rgba(255, 252, 245, 0.72); --pat-panel2: rgba(255, 250, 240, 0.85); --pat-panel3: rgba(255, 248, 235, 0.95);
  --pat-line: rgba(146, 100, 32, 0.24); --pat-line-soft: rgba(146, 100, 32, 0.13); --pat-hair: rgba(60, 44, 20, 0.10);
  --pat-ink2: #6b5840; --pat-ink3: #9a8768; --pat-amber-ink: #92400e;
  --pat-shadow: 0 24px 55px rgba(146, 100, 32, 0.16); --pat-shadow-soft: 0 10px 30px rgba(146, 100, 32, 0.12);
  --pat-glow: 0 0 40px rgba(217, 119, 6, 0.10); --pat-spot: rgba(217, 119, 6, 0.08);
}
.pat-glass { position: relative; background: var(--pat-panel); border: 1px solid var(--pat-line); border-radius: 20px;
  backdrop-filter: blur(20px) saturate(1.25); -webkit-backdrop-filter: blur(20px) saturate(1.25);
  box-shadow: var(--pat-shadow-soft), inset 0 1px 0 rgba(255, 244, 224, 0.08); overflow: hidden; }

/* ── chip rail ── */
.pat-rail { position: sticky; top: 0; z-index: 40; display: flex; gap: 10px; padding: 13px 4px; align-items: center;
  background: color-mix(in srgb, var(--sd-bg, #0c0906) 72%, transparent); backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px); border-bottom: 1px solid var(--pat-hair); margin-top: 26px; flex-wrap: wrap; }
.pchip { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 99px;
  border: 1px solid var(--pat-line-soft); background: transparent; font-size: 11px; letter-spacing: 0.14em;
  color: var(--pat-ink2); cursor: pointer; transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
.pchip:hover { border-color: var(--pat-line); color: var(--sd-text); transform: translateY(-2px); }
.pchip.on { background: linear-gradient(120deg, rgba(232, 176, 75, 0.2), rgba(180, 83, 9, 0.14));
  border-color: var(--sd-pir-core); color: var(--pat-amber-ink); }
.pchip .ct { font-size: 9.5px; padding: 2px 7px; border-radius: 99px; background: var(--pat-panel3); color: var(--pat-ink2);
  font-variant-numeric: tabular-nums; }
.pchip.on .ct { background: rgba(232, 176, 75, 0.25); color: var(--pat-amber-ink); }
.pchip.ghost { padding: 8px 11px; }
.pchip.ghost.spin :deep(svg) { animation: pat-spin 0.9s linear infinite; }
@keyframes pat-spin { to { transform: rotate(360deg); } }
.rail-note { margin-left: auto; font-size: 9.5px; color: var(--pat-ink3); letter-spacing: 0.14em; }

/* ── sections ── */
.pat-sec { padding: 60px 0 6px; }
.shead { display: flex; align-items: baseline; gap: 22px; margin-bottom: 26px; flex-wrap: wrap; }
.shead .se { font-size: 10.5px; letter-spacing: 0.3em; color: var(--pat-amber-ink); white-space: nowrap; }
.shead h2 { font-size: 32px; font-weight: 200; letter-spacing: -0.02em; white-space: nowrap; margin: 0;
  color: var(--sd-text) !important; }
.shead .rule { flex: 1; height: 1px; background: linear-gradient(90deg, var(--pat-line), transparent); }
.shead .snote { font-size: 11px; color: var(--pat-ink3); white-space: nowrap; }
.pat-empty { border: 1px dashed var(--pat-line); border-radius: 16px; padding: 26px; text-align: center;
  color: var(--pat-ink3); font-size: 12.5px; }
.pat-empty.ok { border-color: rgba(52, 211, 153, 0.3); color: var(--pat-ink2); }
.pat-empty.in-table { border: none; }

/* ── docket ── */
.drow-l { display: flex; flex-direction: column; gap: 12px; }
.drk { display: flex; align-items: stretch; padding: 0; cursor: pointer; text-align: left; font-family: inherit;
  color: inherit; transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.35s, box-shadow 0.35s; }
.drk:hover { transform: translateX(6px); border-color: var(--pat-line); box-shadow: var(--pat-shadow-soft), var(--pat-glow); }
.drk .spine { width: 4px; align-self: stretch; border-radius: 4px 0 0 4px; flex-shrink: 0; }
.drk .spine.s1 { background: linear-gradient(180deg, var(--sd-pir-red), rgba(239, 68, 68, 0.2)); }
.drk .spine.s2 { background: linear-gradient(180deg, var(--sd-pir-core), rgba(232, 176, 75, 0.15)); }
.drk .spine.s3, .drk .spine.s4 { background: linear-gradient(180deg, var(--pat-ink3), transparent); }
.drk-main { flex: 1; min-width: 0; padding: 18px 22px; display: flex; flex-direction: column; }
.drk-top { display: flex; align-items: center; gap: 10px; font-size: 10.5px; letter-spacing: 0.08em;
  color: var(--pat-amber-ink); margin-bottom: 7px; flex-wrap: wrap; }
.svc { font-size: 9.5px; padding: 2px 8px; border-radius: 6px; background: var(--pat-panel2);
  border: 1px solid var(--pat-line-soft); color: var(--pat-ink2); letter-spacing: 0.06em; }
.sev { font-size: 9px; letter-spacing: 0.1em; padding: 3px 7px; border-radius: 6px; }
.sev.s1 { color: var(--sd-pir-red); background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35); }
.sev.s2 { color: var(--pat-amber-ink); background: rgba(232, 176, 75, 0.1); border: 1px solid var(--pat-line); }
.sev.s3, .sev.s4 { color: var(--pat-ink2); border: 1px solid var(--pat-hair); }
.drk h4 { font-size: 16.5px; font-weight: 300; letter-spacing: -0.01em; margin: 0 0 7px; color: var(--sd-text); }
.drk-meta { display: flex; align-items: center; gap: 9px; font-size: 11px; color: var(--pat-ink3); flex-wrap: wrap; }
.drk-meta .you { color: var(--pat-amber-ink); }
.ava { width: 24px; height: 24px; border-radius: 50%; display: inline-grid; place-items: center; flex-shrink: 0;
  font-family: var(--sd-mono); font-size: 9px; color: #f5c56b;
  background: linear-gradient(140deg, rgba(232, 176, 75, 0.22), rgba(180, 83, 9, 0.16)); border: 1px solid var(--pat-line); }
[data-theme="light"] .ava { color: var(--sd-pir-deep); }
.drk-r { display: flex; flex-direction: column; align-items: flex-end; justify-content: center; gap: 9px;
  padding: 18px 22px; flex-shrink: 0; }
.state { font-size: 9.5px; letter-spacing: 0.18em; padding: 5px 11px; border-radius: 99px; border: 1px solid var(--pat-line);
  color: var(--pat-amber-ink); white-space: nowrap; }
.state.four { color: var(--pat-ink3); border-color: var(--pat-hair); }
.gbtn { background: none; border: 1px solid var(--pat-line-soft); border-radius: 9px; padding: 7px 14px; font-size: 10.5px;
  letter-spacing: 0.1em; color: var(--pat-ink2); transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.gbtn.real { cursor: pointer; font-family: var(--sd-mono); }
.drk:hover .gbtn, .gbtn.real:hover:not(:disabled) { border-color: var(--sd-pir-core); color: var(--pat-amber-ink);
  transform: translateY(-2px); box-shadow: var(--pat-glow); }
.pat-drk-enter-from { opacity: 0; transform: translateY(-18px) scale(0.98); }
.pat-drk-leave-to { opacity: 0; transform: translateX(40px) scale(0.97); }
.pat-drk-enter-active, .pat-drk-leave-active { transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1); }

/* ── publish desk ── */
.pub-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 32px; }
@media (max-width: 1080px) { .pub-grid { grid-template-columns: 1fr; } }
.pubc { padding: 24px 26px; transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.45s, opacity 0.5s; }
.pubc:hover { transform: translateY(-4px); box-shadow: var(--pat-shadow), var(--pat-glow); }
.pubc.publishing { transform: translateY(-10px) scale(1.03); box-shadow: var(--pat-shadow), 0 0 80px rgba(232, 176, 75, 0.3); z-index: 5; }
.pubc.gone { opacity: 0; transform: scale(0.92) translateY(14px); }
.pubc .ringfx { position: absolute; inset: -1px; border-radius: 20px; border: 2px solid var(--sd-pir-core); opacity: 0; pointer-events: none; }
.pubc.publishing .ringfx { animation: pat-ringetch 1.1s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes pat-ringetch { 0% { opacity: 0; transform: scale(0.94); } 35% { opacity: 1; } 100% { opacity: 0; transform: scale(1.05); } }
.pubc h4 { font-size: 17px; font-weight: 300; margin: 7px 0 0; color: var(--sd-text); }
.sealline { display: flex; align-items: center; gap: 9px; font-size: 10.5px; color: var(--sd-pir-em); margin: 10px 0 16px; }
.sealline :deep(svg) { color: var(--sd-pir-em); }
.dist { border: 1px solid var(--pat-line-soft); border-radius: 14px; padding: 14px 16px; background: var(--pat-panel); margin-bottom: 18px; }
.dist .dl { font-size: 9px; letter-spacing: 0.22em; color: var(--pat-ink3); margin-bottom: 11px; }
.drow { display: flex; gap: 10px; }
.dr { flex: 1; text-align: center; padding: 9px 6px; border: 1px solid var(--pat-hair); border-radius: 10px;
  transition: border-color 0.3s, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.dr:hover { border-color: var(--pat-line); transform: translateY(-2px); }
.dr .dn { font-size: 19px; font-weight: 300; color: var(--sd-text); font-variant-numeric: tabular-nums; }
.dr .dt { font-size: 8.5px; letter-spacing: 0.16em; color: var(--pat-ink3); margin-top: 3px; }
.dtotal { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; font-size: 10.5px; color: var(--pat-ink2); }
.dtotal .tot { color: var(--pat-amber-ink); font-weight: 500; font-variant-numeric: tabular-nums; }
.pverbs { display: flex; gap: 10px; }
.abtn { flex: 1; border: none; border-radius: 12px; padding: 13px 18px; font-size: 11.5px; letter-spacing: 0.14em;
  font-weight: 600; cursor: pointer; color: #1a1206; position: relative; overflow: hidden;
  background: linear-gradient(120deg, #f5c56b, var(--sd-pir-core) 55%, var(--sd-pir-deep));
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s; }
.abtn::after { content: ''; position: absolute; top: 0; left: -60%; width: 40%; height: 100%; transform: skewX(-20deg);
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent); transition: left 0.6s; }
.abtn:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 12px 30px rgba(232, 176, 75, 0.35); }
.abtn:hover::after { left: 120%; }
.abtn:active { transform: translateY(-1px) scale(0.98); }
.abtn:disabled { opacity: 0.5; cursor: not-allowed; }
.pub-empty { grid-column: span 2; padding: 34px; text-align: center; color: var(--pat-ink3); font-size: 12.5px; }
@media (max-width: 1080px) { .pub-empty { grid-column: span 1; } }

.canonh { font-size: 10px; letter-spacing: 0.26em; color: var(--pat-ink3); margin-bottom: 16px;
  display: flex; align-items: center; gap: 14px; }
.canonh::after { content: ''; flex: 1; height: 1px; background: var(--pat-hair); }
.canon { display: flex; gap: 14px; overflow-x: auto; padding-bottom: 10px; scrollbar-width: thin; }
.ctile { min-width: 250px; padding: 16px 18px; border-left: 3px solid var(--sd-pir-em); cursor: pointer;
  text-align: left; font-family: inherit; color: inherit;
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s; }
.ctile:hover { transform: translateY(-4px); box-shadow: var(--pat-shadow-soft), 0 0 30px rgba(52, 211, 153, 0.1); }
.ctile.new { animation: pat-cin 0.9s cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes pat-cin { from { opacity: 0; transform: scale(0.9); } }
.ctile .cid { font-size: 10px; color: var(--sd-pir-em); letter-spacing: 0.1em; }
.ctile .ctt { font-size: 12.5px; font-weight: 300; margin: 7px 0 9px; line-height: 1.4; color: var(--sd-text); }
.ctile .cm { font-size: 10px; color: var(--pat-ink3); display: flex; justify-content: space-between; gap: 10px; }
.canon-empty { padding: 18px 6px; font-size: 10px; color: var(--pat-ink3); letter-spacing: 0.2em; }

/* ── analytics ── */
.ana { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
@media (max-width: 1200px) { .ana { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 760px) { .ana { grid-template-columns: 1fr; } }
.anac { padding: 22px 24px; min-height: 230px; display: flex; flex-direction: column;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s; }
.anac:hover { transform: translateY(-4px); box-shadow: var(--pat-shadow-soft), var(--pat-glow); }
.anac .at { font-size: 10px; letter-spacing: 0.24em; color: var(--pat-ink3); margin-bottom: 4px; }
.anac .av { font-size: 30px; font-weight: 200; margin-bottom: 2px; color: var(--sd-text); font-variant-numeric: tabular-nums; }
.anac .av em { font-style: normal; font-size: 14px; color: var(--pat-ink3); }
.anac .as { font-size: 10px; color: var(--pat-ink3); margin-bottom: 14px; }
.anaviz { width: 100%; margin-top: auto; }
.arcTrack { stroke: var(--pat-line-soft); fill: none; }
.arcVal { fill: none; stroke-linecap: round; transition: stroke-dashoffset 1.7s cubic-bezier(0.16, 1, 0.3, 1); }
.latbar { margin-top: auto; }
.lb-track { position: relative; height: 10px; border-radius: 99px; background: var(--pat-panel2); overflow: visible; }
.lb-track i { display: block; height: 100%; border-radius: 99px;
  background: linear-gradient(90deg, var(--sd-pir-em), var(--sd-pir-core)); transition: width 1.2s cubic-bezier(0.16, 1, 0.3, 1); }
.lb-track i.hot { background: linear-gradient(90deg, var(--sd-pir-core), var(--sd-pir-red)); }
.lb-target { position: absolute; top: -4px; bottom: -4px; width: 2px; background: var(--sd-pir-red); opacity: 0.7; }
.lb-scale { display: flex; justify-content: space-between; font-size: 8.5px; letter-spacing: 0.14em;
  color: var(--pat-ink3); margin-top: 8px; }
.pubmeta { margin-top: auto; display: flex; flex-direction: column; gap: 10px; font-size: 10px;
  letter-spacing: 0.14em; color: var(--pat-ink3); }
.pubmeta b { color: var(--pat-amber-ink); font-variant-numeric: tabular-nums; }
.fbar { margin-top: auto; }
.sbar { display: flex; height: 7px; border-radius: 99px; overflow: hidden; background: var(--pat-panel2); }
.sbar.big { height: 10px; }
.sbar i { display: block; height: 100%; transform-origin: left; animation: pat-grow 1.2s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes pat-grow { from { transform: scaleX(0); } }
.sbar .sdone { background: var(--sd-pir-em); } .sbar .sprog { background: var(--sd-pir-core); }
.sbar .sopen { background: rgba(232, 176, 75, 0.25); } .sbar .sovd { background: var(--sd-pir-red); }
.slegend { display: flex; gap: 13px; font-size: 9.5px; color: var(--pat-ink3); flex-wrap: wrap; margin-top: 8px; }
.slegend i { display: inline-block; width: 7px; height: 7px; border-radius: 2px; margin-right: 5px; }
.slegend .lg-done { background: var(--sd-pir-em); } .slegend .lg-prog { background: var(--sd-pir-core); }
.slegend .lg-open { background: rgba(232, 176, 75, 0.3); } .slegend .lg-ovd { background: var(--sd-pir-red); }

/* ── action governance ── */
.atable { overflow-x: auto; }
.atr { display: grid; grid-template-columns: 100px 1fr 112px 130px 120px 96px 170px; gap: 14px; align-items: center;
  padding: 15px 22px; font-size: 12px; min-width: 900px;
  transition: background 0.3s, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.atr:hover { background: var(--pat-panel2); transform: translateX(4px); }
.atr + .atr { border-top: 1px solid var(--pat-hair); }
.atr.head { font-size: 9px; letter-spacing: 0.22em; color: var(--pat-ink3); background: var(--pat-panel); padding: 12px 22px; }
.atr.head:hover { transform: none; }
.aid { font-size: 10.5px; color: var(--pat-amber-ink); letter-spacing: 0.06em; }
.atxt { font-weight: 300; color: var(--sd-text); line-height: 1.4; }
.atype { font-size: 9px; letter-spacing: 0.14em; padding: 3px 9px; border-radius: 99px; width: fit-content; }
.atype.corr { color: var(--pat-amber-ink); border: 1px solid var(--pat-line); }
.atype.prev { color: var(--pat-ink2); border: 1px solid var(--pat-hair); }
.ownc { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--pat-ink2); }
.srcp { font-size: 10px; color: var(--pat-ink3); }
.srcp.link { cursor: pointer; color: var(--pat-amber-ink); }
.srcp.link:hover { text-decoration: underline; }
.due { font-size: 11px; color: var(--pat-ink2); font-variant-numeric: tabular-nums; }
.ast-cell { display: flex; align-items: center; gap: 8px; }
.astat { font-size: 9.5px; letter-spacing: 0.14em; padding: 4px 10px; border-radius: 99px; width: fit-content;
  display: flex; align-items: center; gap: 6px; white-space: nowrap; }
.astat.ovd { color: var(--sd-pir-red); background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.35); }
.astat.ovd::before { content: ''; width: 5px; height: 5px; border-radius: 50%; background: var(--sd-pir-red);
  animation: pat-opulse 1.6s infinite; }
@keyframes pat-opulse { 50% { opacity: 0.4; } }
.astat.prog { color: var(--pat-amber-ink); background: rgba(232, 176, 75, 0.08); border: 1px solid var(--pat-line); }
.astat.open { color: var(--pat-ink2); border: 1px solid var(--pat-hair); }
.astat.done { color: var(--sd-pir-em); background: rgba(52, 211, 153, 0.08); border: 1px solid rgba(52, 211, 153, 0.3); }
.rmind { opacity: 0; padding: 4px 9px; font-size: 9px; }
.atr:hover .rmind { opacity: 1; }

/* ── owed ladder ── */
.ladder { display: flex; flex-direction: column; gap: 13px; }
.lrow { display: flex; align-items: center; gap: 20px; padding: 19px 24px;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s; flex-wrap: wrap; }
.lrow:hover { transform: translateX(6px); box-shadow: var(--pat-shadow-soft), var(--pat-glow); }
.lteam { width: 190px; flex-shrink: 0; }
.lteam .tn { font-size: 14.5px; font-weight: 400; letter-spacing: -0.01em; color: var(--sd-text); }
.lteam .tl { font-size: 10px; color: var(--pat-ink3); margin-top: 3px; }
.linc { flex: 1; min-width: 220px; }
.linc .li { font-size: 10.5px; color: var(--pat-amber-ink); letter-spacing: 0.06em; display: flex; gap: 9px;
  align-items: center; margin-bottom: 5px; }
.linc .lt { font-size: 12.5px; color: var(--pat-ink2); font-weight: 300; white-space: nowrap; overflow: hidden; text-overflow: ellipssis; }
.agebar { width: 230px; flex-shrink: 0; }
.agebar .ab { height: 6px; border-radius: 99px; background: var(--pat-panel2); overflow: hidden; margin-bottom: 6px; }
.agebar .ab i { display: block; height: 100%; border-radius: 99px; transform-origin: left;
  animation: pat-grow 1.1s cubic-bezier(0.16, 1, 0.3, 1) both; }
.agebar .al { font-size: 9px; letter-spacing: 0.14em; color: var(--pat-ink3); display: flex; justify-content: space-between; }
.aged { font-size: 26px; font-weight: 200; width: 74px; text-align: right; flex-shrink: 0; color: var(--sd-text);
  font-variant-numeric: tabular-nums; }
.aged em { font-style: normal; font-size: 12px; color: var(--pat-ink3); }
.aged.hot { color: var(--sd-pir-red); }
.nudge { border: 1px solid var(--pat-line); background: none; border-radius: 10px; padding: 10px 18px; font-size: 10.5px;
  letter-spacing: 0.14em; color: var(--pat-amber-ink); flex-shrink: 0; cursor: pointer;
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
.nudge:hover:not(:disabled) { background: rgba(232, 176, 75, 0.12); transform: translateY(-2px); box-shadow: var(--pat-glow); }
.nudge.sent { color: var(--sd-pir-em); border-color: rgba(52, 211, 153, 0.4); pointer-events: none; }
.nudge:disabled { cursor: not-allowed; }
.escnote { margin-top: 20px; font-size: 10.5px; color: var(--pat-ink3); display: flex; gap: 8px; align-items: center; letter-spacing: 0.08em; }
.escnote :deep(svg) { color: var(--pat-ink3); flex-shrink: 0; }

/* ── footer ── */
.pat-foot { margin-top: 70px; border-top: 1px solid var(--pat-hair); padding: 26px 0 12px; display: flex;
  justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap;
  font-size: 10px; letter-spacing: 0.22em; color: var(--pat-ink3); }
.pat-foot .fdot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--sd-pir-em);
  margin-right: 9px; box-shadow: 0 0 8px rgba(52, 211, 153, 0.7); animation: pat-opulse 2.5s infinite; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .sbar i,
  html:not([data-cinematic="on"]) .agebar .ab i,
  html:not([data-cinematic="on"]) .astat.ovd::before,
  html:not([data-cinematic="on"]) .pat-foot .fdot { animation: none; }
}
</style>

<style>
/* publish fan-out particles (appended to <body> — unscoped by design) */
.pat-pfx { position: fixed; width: 6px; height: 6px; border-radius: 50%; background: #f5c56b; z-index: 3000;
  pointer-events: none; box-shadow: 0 0 10px rgba(245, 197, 107, 0.9);
  transition: transform 0.95s cubic-bezier(0.3, 0.7, 0.3, 1), opacity 1s; }
</style>
