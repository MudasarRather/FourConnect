<template>
  <section class="gds">
    <span class="gds-orb o1" aria-hidden="true" /><span class="gds-orb o2" aria-hidden="true" />

    <!-- ═══ HERO — the Glass Dossier ═══ -->
    <header class="gds-hero">
      <Motion :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
        <p class="gds-eyebrow">Fault Grid · Post-Incident</p>
        <h1 class="gds-h1">The Glass <em>Dossier</em></h1>
        <p class="gds-sub">Every section of the review is a pane of glass. Fill it and it etches; light finds its edges.
          When the account is whole, the stack fuses into a single sealed slab for the record.
          <span class="sd-mono gds-viewer" v-if="me">VIEWER · {{ (me.full_name || 'AGENT').toUpperCase() }}<template v-if="isLead"> · TEAM LEAD</template></span>
        </p>
      </Motion>

      <div class="gds-hero-grid">
        <SdPirPaneStack :panes="panes" :cap-pir="active?.report_number || '—'"
          :cap-inc="capInc" :fused="fused" :seal-line="sealLine" @pane="focusCard" />

        <div class="gds-chips-col">
          <div class="gds-chips-head"><span>Desk Readout</span><span class="sd-mono">{{ todayLabel }}</span></div>
          <div class="gds-chip-grid">
            <button v-for="(c, i) in statChips" :key="c.key" class="gds-schip" :class="[c.tone, { on: desk.lens.value === c.key }]"
              :style="{ '--i': i }" @click="desk.applyLens(c.key)">
              <div class="v"><SdCountUp :value="c.value" :duration="900" /></div>
              <div class="k">{{ c.label }}</div>
            </button>
            <div class="gds-schip wide" :style="{ '--i': 6 }">
              <svg class="cov-ring" viewBox="0 0 56 56">
                <circle class="trk" cx="28" cy="28" r="23" />
                <circle class="fll" cx="28" cy="28" r="23" :style="{ strokeDashoffset: covDash }" />
              </svg>
              <div>
                <div class="v"><SdCountUp :value="coveragePct" :duration="1100" /><small> %</small></div>
                <div class="k">Coverage · Terminal SEV1/2</div>
              </div>
              <div class="gds-subchips">
                <span class="gds-subchip sd-mono">MEDIAN REVIEW <b>{{ medianReview }}</b></span>
                <span class="gds-subchip sd-mono">MTTR <b>{{ mttrLabel }}</b></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- ═══ LENSES + THE SHELF ═══ -->
    <section class="gds-zone">
      <div class="gds-lenses">
        <button v-for="(l, key) in PIR_LENSES" :key="key" class="gds-lens" :class="{ active: desk.lens.value === key }"
          @click="desk.applyLens(key)">{{ l.label }} <span class="n">{{ desk.statOf(key) }}</span></button>
        <div class="gds-search">
          <Search :size="12" />
          <input v-model="desk.q.value" type="text" placeholder="number · subject · service…" />
        </div>
        <button class="gds-refresh" :class="{ spin: desk.loading.value }" title="Refresh the desk" @click="refreshAll(false)"><RefreshCw :size="13" /></button>
      </div>
      <div class="gds-zone-head">
        <h2>The Shelf</h2><span class="tag">{{ shelfTag }}</span><div class="rule" />
      </div>
      <TransitionGroup name="gds-tile" tag="div" class="gds-shelf">
        <button v-for="(r, i) in desk.rows.value" :key="r.pir_id || r.ticket_id" class="gds-tile"
          :data-status="tileStatus(r)" :style="{ '--i': i % 12 }" @click="openRow(r)">
          <span class="t-top"><span class="dot" /><span class="t-st">{{ tileState(r) }}</span></span>
          <h3>{{ r.kind === 'pir' ? (r.title || r.subject) : r.subject }}</h3>
          <span class="meta">
            <span v-if="r.report_number">{{ r.report_number }}</span>
            <span>{{ r.ticket_number }}</span>
            <span :class="'sev' + r.sev">SEV{{ r.sev }}</span>
            <span v-if="r.team_name">{{ r.team_name }}</span>
            <span v-if="r.kind === 'pir' && r.actions_total">{{ r.actions_done }}/{{ r.actions_total }} ACTIONS<template v-if="r.actions_overdue"> · <b class="ovr">{{ r.actions_overdue }} OVERDUE</b></template></span>
          </span>
        </button>
      </TransitionGroup>
      <div v-if="!desk.loading.value && !desk.rows.value.length" class="gds-empty-strip">
        Nothing under this lens — the record is clean here.
        <button class="gds-clear" @click="desk.clearLenses">Clear filters</button>
      </div>
      <SdIncPager v-if="desk.total.value > LIMIT" :page="desk.page.value" :total="desk.total.value" :limit="LIMIT"
        @update:page="p => { desk.page.value = p }" />
    </section>

    <!-- ═══ OWED INTAKE ═══ -->
    <section class="gds-zone">
      <div class="gds-zone-head">
        <h2>Unopened Dossiers</h2><span class="tag">Terminal SEV1/2 · no review on file</span><div class="rule" />
      </div>
      <div v-if="owed.length" class="gds-owed-row">
        <div v-for="(o, i) in owed" :key="o.ticket_id" class="gds-owed-pane" :style="{ '--i': i }">
          <h3>{{ o.subject }}</h3>
          <span class="meta">
            <span>{{ o.ticket_number }}</span>
            <span :class="'s' + o.sev">SEV{{ o.sev }}</span>
            <span v-if="o.team_name">{{ o.team_name }}</span>
            <span>terminal</span>
          </span>
          <div class="owed-foot">
            <span class="gds-age" :class="ageClass(o.age_days)">{{ o.age_days ?? 0 }} days owed</span>
            <button class="gds-open-rev" :disabled="busy || !canActPir(o)"
              :title="canActPir(o) ? 'Open the post-incident review' : 'Only the incident\'s owner, commander, a collaborator, the team lead or an admin can open its review'"
              @click="openReview(o)">Open Review →</button>
          </div>
        </div>
      </div>
      <div v-else class="gds-empty-strip ok">Every eligible closure has a dossier on file. The desk is caught up.</div>
    </section>

    <!-- ═══ THE OPEN DOSSIER (builder) ═══ -->
    <section ref="builderEl" class="gds-zone">
      <div class="gds-zone-head">
        <h2>The Open Dossier</h2><span class="tag">Active review · each card etches a pane</span><div class="rule" />
      </div>
      <SdPirGlassBuilder :pir="active" :me="me" :busy="busy" :can-act="canActActive"
        @panes="v => { builderPanes = v }" @save="onSave" @submit="onSubmit" @blocked="onBlocked"
        @action-status="onActionStatus" @export-pdf="onPdf" @refresh-metrics="onFreezeMetrics"
        @refresh-timeline="onResnap" @open-incident="id => $emit('open', id)" />
    </section>

    <!-- ═══ MY FOLLOW-THROUGH ═══ -->
    <section class="gds-zone">
      <div class="gds-zone-head">
        <h2>My Follow-Through</h2><span class="tag">Actions assigned to me · overdue burns first</span><div class="rule" />
      </div>
      <div v-if="myActions.length" class="gds-actions-strip">
        <div v-for="(a, i) in myActions" :key="a.aid || (a.pir_id + a.kind + a.index)" class="gds-acard"
          :class="{ overdue: a.overdue && a.status !== 'done', 'done-card': a.status === 'done' }" :style="{ '--i': i }">
          <h4>{{ a.action }}</h4>
          <div class="src">{{ a.report_number }} · {{ a.ticket_number }}</div>
          <div class="arow">
            <span class="due sd-mono" :class="{ over: a.overdue && a.status !== 'done' }">
              {{ a.overdue && a.status !== 'done' ? '⚑ was due ' + shortDate(a.target_date) : (a.target_date ? 'due ' + shortDate(a.target_date) : 'no target') }}
            </span>
            <button class="gds-pill" :class="[a.status, { 'overdue-ring': a.overdue && a.status === 'open' }]"
              :disabled="busy || !['approved', 'published'].includes(a.pir_status)"
              :title="['approved', 'published'].includes(a.pir_status) ? 'Cycle status' : 'Editable in the dossier while draft/in review'"
              @click="cycleMyAction(a)">{{ pillLabel(a.status) }}</button>
          </div>
        </div>
      </div>
      <div v-else class="gds-empty-strip ok">No follow-through on your name. Clean slate.</div>
    </section>

    <!-- ═══ LEAD REVIEW TRAY ═══ -->
    <section v-if="isLead || caps.isAdmin" class="gds-zone">
      <div class="gds-zone-head">
        <h2>Lead Review Tray</h2><span class="tag">Visible to team leads · four-eyes enforced</span><div class="rule" />
      </div>
      <div v-if="tray.length" class="gds-tray">
        <div v-for="p in tray" :key="p.pir_id" class="gds-plate-card" :class="{ locked: fourEyes(p) }">
          <p class="p-eyebrow">Awaiting sign-off</p>
          <h3>{{ p.report_number }} — {{ p.title || p.subject }}</h3>
          <div class="p-meta">
            <span>{{ p.ticket_number }}</span>
            <span :class="'s' + p.sev">SEV{{ p.sev }}</span>
            <span v-if="p.team_name">{{ p.team_name }}</span>
            <span>Author · {{ p.created_by_name || '—' }}<template v-if="fourEyes(p)"> (you)</template></span>
            <span v-if="p.submitted_at">Submitted {{ shortDate(p.submitted_at) }}</span>
          </div>
          <div class="p-verbs">
            <button class="gds-dk-btn" :disabled="busy" @click="approve(p)">✓ Approve · Seal the Pane</button>
            <button class="gds-dk-btn rej" :disabled="busy" @click="rejOpen = rejOpen === p.pir_id ? null : p.pir_id">Reject with Note</button>
            <button class="gds-dk-btn ghost" @click="loadPirById(p.pir_id)">Read Dossier</button>
          </div>
          <div v-if="rejOpen === p.pir_id" class="gds-rej-note">
            <textarea v-model="rejNote" rows="2" placeholder="A note is required — it returns to draft with the dossier…" />
            <div class="rn-row"><button class="gds-dk-btn rej" :disabled="busy" @click="reject(p)">Confirm Return to Draft</button></div>
          </div>
          <div v-if="fourEyes(p)" class="gds-four-eyes">
            <Lock :size="16" />
            <div>
              <div class="fe-t">Four-Eyes · Frosted for You</div>
              <p>You submitted this dossier. Its verbs stay frosted at your desk — a different team lead, or an
                administrator, must approve or return it. Your own hand cannot seal your own account.</p>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="gds-empty-strip ok">Nothing awaiting your sign-off.</div>
    </section>

    <footer class="gds-foot sd-mono">
      <span><b>Fourconnect Support Desk</b> · Post-Incident Program</span>
      <span v-if="desk.stats.value">{{ desk.statOf('published') }} PUBLISHED · {{ desk.statOf('in_review') }} IN REVIEW · {{ desk.statOf('owed') }} OWED</span>
    </footer>
  </section>
</template>

<script setup>
/* SdIncPirSection — AGENT desk "THE GLASS DOSSIER" (user-picked artifact A8, ported 1:1).
   Spine: usePirDesk over GET /incidents/pirs/board (rows + lockstep stats). The hero
   pane-stack etches live from the builder's section checks; submit fuses the stack.
   Leads get the review tray (approve/reject, four-eyes frosting); publish stays an
   admin ceremony on the Command Funnel desk. */
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import { Search, RefreshCw, Lock } from 'lucide-vue-next'
import {
  fetchMe, fetchCapabilities, useCapabilities, canActOnIncident,
  fetchPirBoard, getPir, createPir, updatePir, submitPir, approvePir, rejectPir,
  exportPirPdf, patchPirAction, fetchIncidentStats,
} from '@/composables/useSupportDesk'
import { usePirDesk, PIR_LENSES } from '../composables/usePirDesk'
import SdPirPaneStack from '../components/SdPirPaneStack.vue'
import SdPirGlassBuilder from '../components/SdPirGlassBuilder.vue'
import SdCountUp from '../components/SdCountUp.vue'
import SdIncPager from '../components/SdIncPager.vue'

const props = defineProps({ panel: { type: String, default: 'employee' } })
const emit = defineEmits(['go', 'open', 'changed', 'new'])

const LIMIT = 12
const toast = useToast()
const desk = usePirDesk({ panel: props.panel, limit: LIMIT, defaultLens: 'all', actions: true })
const caps = useCapabilities()

const me = ref(null)
const busy = ref(false)
const active = ref(null)              // the open dossier (full PirResponse)
const builderPanes = ref([])
const owed = ref([])
const tray = ref([])
const rejOpen = ref(null)
const rejNote = ref('')
const incStats = ref(null)
const builderEl = ref(null)

const isLead = computed(() => (caps.leadTeamIds || []).length > 0)
// actor-tier: only the incident's owner/commander/collaborator/lead/admin may open
// or author its review (mirrors backend _require_ticket_actor) — gate the affordance
// so a bystander never clicks "Open Review" / Save / Submit into a 403.
const canActPir = (x) => canActOnIncident(x, me.value, caps)
const canActActive = computed(() => (active.value ? canActPir(active.value) : false))
const fused = computed(() => !!active.value && active.value.status !== 'draft')
const sealLine = computed(() => ({ in_review: 'In Review', approved: 'Approved', published: 'Published' }[active.value?.status] || 'In Review'))
const capInc = computed(() => active.value
  ? `${active.value.ticket_number || ''} · SEV${active.value.sev}` : 'open a dossier below')

const EMPTY_PANES = [
  { k: 'record', label: 'Record · Meeting & Trails', lit: false },
  { k: 'actions', label: 'Action Registers', lit: false },
  { k: 'retro', label: 'Blameless Retro', lit: false },
  { k: 'factors', label: 'Contributing Factors', lit: false },
  { k: 'whys', label: 'Five Whys', lit: false },
  { k: 'root', label: 'Root Cause', lit: false },
  { k: 'metrics', label: 'Frozen Metrics', lit: false },
  { k: 'summary', label: 'Executive Summary', lit: false },
]
const panes = computed(() => (active.value && builderPanes.value.length ? builderPanes.value : EMPTY_PANES))

/* ── hero readout ── */
const myOpenCount = computed(() => {
  const c = desk.actions.value?.counts
  return c ? (c.open || 0) : 0
})
const statChips = computed(() => [
  { key: 'owed', label: 'Owed Reviews', value: desk.statOf('owed'), tone: 'c-red' },
  { key: 'drafting', label: 'Drafting', value: desk.statOf('drafting'), tone: '' },
  { key: 'in_review', label: 'In Review', value: desk.statOf('in_review'), tone: '' },
  { key: 'approved', label: 'Approved', value: desk.statOf('approved'), tone: 'c-em' },
  { key: 'published', label: 'Published', value: desk.statOf('published'), tone: 'c-em' },
  { key: 'actions_due', label: 'My Open Actions', value: myOpenCount.value, tone: myOpenCount.value ? 'c-red' : '' },
])
const coveragePct = computed(() => Math.round(desk.stats.value?.coverage_pct ?? 0))
const covDash = computed(() => (144.5 * (1 - coveragePct.value / 100)).toFixed(1))
const medianReview = computed(() => {
  const h = desk.stats.value?.median_review_hours_30d
  return h == null ? '—' : `${Math.round(h)}h`
})
const mttrLabel = computed(() => {
  const v = incStats.value?.mttr_minutes_current_month
  return v == null ? '—' : `${Math.round(v)}m`
})
const todayLabel = new Date().toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
const shelfTag = computed(() => `${desk.total.value} record${desk.total.value === 1 ? '' : 's'} under the ${PIR_LENSES[desk.lens.value]?.label || ''} lens`)

/* ── shelf ── */
const tileStatus = (r) => (r.kind === 'owed' ? 'owed' : r.status)
const tileState = (r) => (r.kind === 'owed'
  ? `Owed · ${r.age_days ?? 0}d unopened`
  : ({ draft: 'Drafting', in_review: 'In review', approved: 'Approved', published: 'Published' }[r.status] || r.status))
const openRow = (r) => { if (r.kind === 'owed') openReview(r); else loadPirById(r.pir_id) }

/* ── side fetches (owed strip + lead tray) ── */
const refreshSide = async () => {
  try {
    const o = await fetchPirBoard({ lens: 'owed', limit: 8 })
    owed.value = o.items || []
  } catch { /* keep last */ }
  if (isLead.value || caps.isAdmin) {
    try {
      const t = await fetchPirBoard({ lens: 'in_review', limit: 6 })
      tray.value = (t.items || []).filter(p => caps.isAdmin || (caps.leadTeamIds || []).includes(String(p.team_id)))
    } catch { /* keep last */ }
  }
}
const refreshAll = (silent = true) => {
  desk.refresh(silent)
  desk.refreshActions({ owner_id: me.value?.id }, silent)
  refreshSide()
}

/* ── builder verbs ── */
const loadPirById = async (id) => {
  try {
    active.value = await getPir(id)
    desk.setFocus(id)
    scrollToBuilder()
    toast.info(`${active.value.report_number} opened — ${active.value.title}`)
  } catch { toast.error('That dossier is beyond your team seal.') }
}
const openReview = async (o) => {
  if (!canActPir(o)) {
    toast.info('Only the incident\'s owner, commander, a collaborator, the team lead or an admin can open its review.')
    return
  }
  busy.value = true
  try {
    const p = await createPir(o.ticket_id)
    active.value = p
    toast.success(`${p.report_number} drafted — the panes are clear. Start etching.`)
    refreshAll()
    scrollToBuilder()
  } catch (e) {
    if (e?.response?.status === 409) {
      toast.info(e.response.data?.detail || 'A dossier already exists for this incident.')
      refreshAll()
    } else toast.error(e?.response?.data?.detail || 'Could not open the review.')
  } finally { busy.value = false }
}
const onSave = async (payload) => {
  if (!active.value) return
  busy.value = true
  try {
    active.value = await updatePir(active.value.id, payload)
    toast.success(`Saved — rev ${(active.value.revisions || []).length} etched into the history.`)
    desk.afterVerb({ owner_id: me.value?.id })
  } catch (e) { toast.error(e?.response?.data?.detail || 'Save failed.') }
  finally { busy.value = false }
}
const onSubmit = async (payload) => {
  if (!active.value) return
  busy.value = true
  try {
    await updatePir(active.value.id, payload)
    active.value = await submitPir(active.value.id)
    toast.success('Fused & submitted. The stack is one slab now — four-eyes applies: a different lead must sign it.')
    refreshAll()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Submit refused.') }
  finally { busy.value = false }
}
const onBlocked = () => toast.warning('Clear panes block the seal: summary, root cause, one corrective action.')
const onActionStatus = async ({ kind, index, aid, status }) => {
  if (!active.value) return
  busy.value = true
  try {
    await patchPirAction(active.value.id, kind, index, { status, aid: aid || undefined })
    active.value = await getPir(active.value.id)
    desk.afterVerb({ owner_id: me.value?.id })
  } catch (e) { toast.error(e?.response?.data?.detail || 'Action update refused.') }
  finally { busy.value = false }
}
const onFreezeMetrics = async () => {
  if (!active.value) return
  busy.value = true
  try {
    active.value = await updatePir(active.value.id, { refresh_metrics: true })
    toast.success('Metrics frozen into the base pane.')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Freeze failed.') }
  finally { busy.value = false }
}
const onResnap = async () => {
  if (!active.value) return
  busy.value = true
  try {
    active.value = await updatePir(active.value.id, { refresh_timeline: true })
    toast.success('Activity trail re-frozen.')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Re-snapshot failed.') }
  finally { busy.value = false }
}
const onPdf = async () => {
  if (!active.value) return
  try {
    const blob = await exportPirPdf(active.value.id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${active.value.report_number}.pdf`; a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    toast.error(e?.response?.status === 503
      ? 'PDF engine offline on the server (GTK runtime missing).' : 'PDF export failed.')
  }
}

/* ── lead tray verbs ── */
const fourEyes = (p) => !caps.isAdmin && me.value && String(p.submitted_by_id || '') === String(me.value.id)
const approve = async (p) => {
  busy.value = true
  try {
    await approvePir(p.pir_id, {})
    toast.success(`${p.report_number} sealed at this desk. Publication is the administrator's ceremony.`)
    if (active.value?.id === p.pir_id) active.value = await getPir(p.pir_id)
    refreshAll()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Approve refused.') }
  finally { busy.value = false }
}
const reject = async (p) => {
  if (!rejNote.value.trim()) { toast.warning('A note is required — tell the author what to fix.'); return }
  busy.value = true
  try {
    await rejectPir(p.pir_id, { note: rejNote.value.trim() })
    toast.success(`Returned to draft — your note travels back with ${p.report_number}.`)
    rejOpen.value = null; rejNote.value = ''
    if (active.value?.id === p.pir_id) active.value = await getPir(p.pir_id)
    refreshAll()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Reject refused.') }
  finally { busy.value = false }
}

/* ── my actions strip ── */
const myActions = computed(() => {
  const rows = desk.actions.value?.items || []
  return [...rows].sort((a, b) => (b.overdue ? 1 : 0) - (a.overdue ? 1 : 0)).slice(0, 8)
})
const NEXT = { open: 'in_progress', in_progress: 'done', done: 'open' }
const cycleMyAction = async (a) => {
  busy.value = true
  try {
    await patchPirAction(a.pir_id, a.kind, a.index, { status: NEXT[a.status || 'open'], aid: a.aid || undefined })
    desk.refreshActions({ owner_id: me.value?.id }, false)
    if (active.value?.id === a.pir_id) active.value = await getPir(a.pir_id)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Action update refused.') }
  finally { busy.value = false }
}

/* ── helpers ── */
const focusCard = () => scrollToBuilder()
const scrollToBuilder = () => builderEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
const shortDate = (v) => {
  if (!v) return '—'
  try { return new Date(v).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) }
  catch { return String(v).slice(0, 10) }
}
const pillLabel = (s) => ({ open: 'Open', in_progress: 'In Progress', done: 'Done' }[s || 'open'] || 'Open')
const ageClass = (d) => (d >= 15 ? 'burn' : d >= 9 ? 'hot' : d >= 4 ? 'warm' : '')

/* ── deep-linked focus (?focus=<pir id>) ── */
watch(() => desk.focusId.value, (id) => {
  if (id && (!active.value || String(active.value.id) !== String(id))) loadPirById(id)
})

onMounted(async () => {
  me.value = await fetchMe()
  await fetchCapabilities()
  desk.start({ owner_id: me.value?.id })
  refreshSide()
  fetchIncidentStats().then(s => { incStats.value = s }).catch(() => {})
  if (desk.focusId.value) loadPirById(desk.focusId.value)
})
onBeforeUnmount(desk.stop)
</script>

<style scoped>
.gds { position: relative; display: flex; flex-direction: column; gap: 0; }
.gds-orb { position: absolute; border-radius: 50%; pointer-events: none; z-index: 0; filter: blur(80px); opacity: 0.45; }
.gds-orb.o1 { width: 520px; height: 520px; left: -140px; top: -120px;
  background: radial-gradient(circle, rgba(232, 176, 75, 0.22), transparent 65%); animation: gds-orbA 26s ease-in-out infinite alternate; }
.gds-orb.o2 { width: 440px; height: 440px; right: -120px; top: 260px;
  background: radial-gradient(circle, rgba(180, 83, 9, 0.18), transparent 65%); animation: gds-orbB 32s ease-in-out infinite alternate; }
@keyframes gds-orbA { from { transform: translate(0, 0) scale(1); } to { transform: translate(70px, 40px) scale(1.12); } }
@keyframes gds-orbB { from { transform: translate(0, 0) scale(1.06); } to { transform: translate(-60px, -30px) scale(0.96); } }
.gds > *:not(.gds-orb) { position: relative; z-index: 1; }

/* ── hero ── */
.gds-hero { padding: 10px 0 6px; }
.gds-eyebrow { font-family: var(--sd-mono); font-size: 11px; letter-spacing: 0.34em; color: var(--sd-pir-core);
  text-transform: uppercase; margin: 0 0 14px; display: flex; align-items: center; gap: 12px; }
.gds-eyebrow::before { content: ''; width: 34px; height: 1px; background: var(--sd-pir-core); opacity: 0.6; }
/* !important re-pins vs theme-light-rescue's `[class*="page"] h1–h4` catch-all */
.gds-h1 { font-weight: 200; font-size: clamp(36px, 4.6vw, 64px); letter-spacing: -0.015em; line-height: 1.02;
  margin: 0; color: var(--sd-text) !important; }
.gds-h1 em { font-style: normal; font-weight: 300; color: var(--sd-pir-core); }
.gds-sub { margin: 14px 0 0; color: var(--sd-text-secondary); font-size: 14.5px; max-width: 680px; line-height: 1.6; }
.gds-viewer { display: block; font-size: 11.5px; color: var(--sd-pir-ink3); margin-top: 6px; letter-spacing: 0.12em; }
.gds-hero-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(300px, 1fr); gap: 26px;
  margin-top: 28px; align-items: stretch; }
@media (max-width: 1080px) { .gds-hero-grid { grid-template-columns: 1fr; } }

.gds-chips-col { display: flex; flex-direction: column; gap: 12px; }
.gds-chips-head { font-family: var(--sd-mono); font-size: 10px; letter-spacing: 0.28em; color: var(--sd-pir-ink3);
  text-transform: uppercase; display: flex; justify-content: space-between; }
.gds-chip-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; flex: 1; }
.gds-schip { border-radius: 16px; padding: 16px; position: relative; overflow: hidden; text-align: left;
  cursor: pointer; border: 1px solid var(--sd-pir-brd); font-family: inherit; color: inherit;
  background: var(--sd-pir-glass); backdrop-filter: blur(20px) saturate(150%); -webkit-backdrop-filter: blur(20px) saturate(150%);
  box-shadow: inset 0 1px 0 var(--sd-pir-spec);
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s, border-color 0.35s;
  animation: gds-deal 0.55s cubic-bezier(0.16, 1, 0.3, 1) backwards; animation-delay: calc(var(--i, 0) * 70ms); }
.gds-schip:hover { transform: translateY(-4px); border-color: var(--sd-pir-brd2);
  box-shadow: inset 0 1px 0 var(--sd-pir-spec), 0 14px 34px rgba(0, 0, 0, 0.35); }
.gds-schip.on { border-color: var(--sd-pir-core); box-shadow: inset 0 1px 0 var(--sd-pir-spec), 0 0 0 1px var(--sd-pir-core); }
.gds-schip .v { font-size: 30px; font-weight: 200; letter-spacing: -0.02em; line-height: 1; color: var(--sd-text);
  font-variant-numeric: tabular-nums; }
.gds-schip .v small { font-size: 15px; color: var(--sd-pir-ink3); font-weight: 300; }
.gds-schip .k { font-family: var(--sd-mono); font-size: 9px; letter-spacing: 0.2em; color: var(--sd-pir-ink3);
  text-transform: uppercase; margin-top: 8px; }
.gds-schip.c-red .v { color: var(--sd-pir-red); }
.gds-schip.c-em .v { color: var(--sd-pir-em); }
.gds-schip.wide { grid-column: span 2; display: flex; align-items: center; gap: 16px; cursor: default; }
.cov-ring { width: 56px; height: 56px; transform: rotate(-90deg); flex: none; }
.cov-ring .trk { stroke: rgba(142, 127, 99, 0.28); fill: none; stroke-width: 5.5; }
.cov-ring .fll { stroke: var(--sd-pir-core); fill: none; stroke-width: 5.5; stroke-linecap: round;
  stroke-dasharray: 144.5; stroke-dashoffset: 144.5; transition: stroke-dashoffset 1.6s cubic-bezier(0.16, 1, 0.3, 1); }
.gds-subchips { margin-left: auto; display: flex; gap: 8px; flex-wrap: wrap; }
.gds-subchip { font-size: 10px; letter-spacing: 0.14em; color: var(--sd-pir-ink2); border: 1px solid var(--sd-pir-brd);
  border-radius: 20px; padding: 5px 12px; background: var(--sd-pir-core-soft); }
.gds-subchip b { color: var(--sd-pir-core); }
@keyframes gds-deal { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

/* ── lenses + shelf ── */
.gds-zone { margin: 34px 0 0; }
.gds-zone-head { display: flex; align-items: baseline; gap: 16px; margin-bottom: 16px; }
.gds-zone-head h2 { font-weight: 200; font-size: 26px; letter-spacing: -0.01em; margin: 0; color: var(--sd-text) !important; }
.gds-zone-head .tag { font-family: var(--sd-mono); font-size: 10px; letter-spacing: 0.26em; color: var(--sd-pir-ink3); text-transform: uppercase; }
.gds-zone-head .rule { flex: 1; height: 1px; background: var(--sd-pir-brd); }
.gds-lenses { display: flex; gap: 9px; flex-wrap: wrap; align-items: center; }
.gds-lens { cursor: pointer; font-family: var(--sd-mono); font-size: 9.5px; letter-spacing: 0.18em; text-transform: uppercase;
  border-radius: 22px; border: 1px solid var(--sd-pir-brd); color: var(--sd-pir-ink2); padding: 10px 17px;
  background: var(--sd-pir-glass); backdrop-filter: blur(16px); box-shadow: inset 0 1px 0 var(--sd-pir-spec);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.gds-lens:hover { transform: translateY(-2px); color: var(--sd-pir-core); border-color: var(--sd-pir-brd2); }
.gds-lens.active { background: linear-gradient(180deg, var(--sd-pir-hot), var(--sd-pir-deep)); color: var(--sd-pir-btn-ink);
  font-weight: 700; border-color: transparent; box-shadow: 0 10px 26px rgba(232, 176, 75, 0.3); }
.gds-lens .n { opacity: 0.75; margin-left: 6px; }
.gds-search { display: inline-flex; align-items: center; gap: 8px; margin-left: auto; border: 1px solid var(--sd-pir-brd);
  border-radius: 22px; padding: 8px 15px; color: var(--sd-pir-ink3); background: var(--sd-pir-glass);
  backdrop-filter: blur(16px); min-width: 240px; }
.gds-search input { border: none; background: none; outline: none; color: var(--sd-text); font-size: 12px; flex: 1; }
.gds-search input::placeholder { color: var(--sd-pir-ink3); }
.gds-refresh { display: inline-grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; cursor: pointer;
  border: 1px solid var(--sd-pir-brd); background: var(--sd-pir-glass); color: var(--sd-pir-core);
  transition: transform 0.3s; }
.gds-refresh:hover { transform: rotate(90deg); }
.gds-refresh.spin :deep(svg) { animation: gds-spin 0.9s linear infinite; }
@keyframes gds-spin { to { transform: rotate(360deg); } }

.gds-shelf { display: grid; grid-template-columns: repeat(auto-fill, minmax(258px, 1fr)); gap: 14px; margin-top: 20px; }
.gds-tile { cursor: pointer; border-radius: 16px; padding: 16px 17px; position: relative; overflow: hidden;
  text-align: left; font-family: inherit; color: inherit;
  background: var(--sd-pir-glass); backdrop-filter: blur(20px) saturate(150%); -webkit-backdrop-filter: blur(20px) saturate(150%);
  border: 1px solid var(--sd-pir-brd); box-shadow: inset 0 1px 0 var(--sd-pir-spec);
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s, border-color 0.35s;
  animation: gds-deal 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards; animation-delay: calc(var(--i, 0) * 55ms); }
.gds-tile:hover { transform: translateY(-5px) rotate(-0.3deg); border-color: var(--sd-pir-brd2);
  box-shadow: inset 0 1px 0 var(--sd-pir-spec), 0 20px 44px rgba(0, 0, 0, 0.4); }
.gds-tile::before { content: ''; position: absolute; left: 16px; right: 16px; top: 0; height: 2px; border-radius: 2px;
  opacity: 0.85; background: linear-gradient(90deg, transparent, var(--sd-pir-ink3), transparent); }
.gds-tile[data-status="in_review"]::before { background: linear-gradient(90deg, transparent, var(--sd-pir-hot), transparent); }
.gds-tile[data-status="approved"]::before, .gds-tile[data-status="published"]::before { background: linear-gradient(90deg, transparent, var(--sd-pir-em), transparent); }
.gds-tile[data-status="owed"]::before { background: linear-gradient(90deg, transparent, var(--sd-pir-red), transparent); }
.gds-tile .t-top { display: flex; align-items: center; gap: 9px; margin-bottom: 8px; }
.gds-tile .dot { width: 9px; height: 9px; border-radius: 50%; flex: none; background: var(--sd-pir-ink3); }
.gds-tile[data-status="in_review"] .dot { background: var(--sd-pir-hot); animation: gds-pulse2 1.8s infinite; }
.gds-tile[data-status="approved"] .dot { background: var(--sd-pir-em); }
.gds-tile[data-status="published"] .dot { background: var(--sd-pir-em-deep); box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.15); }
.gds-tile[data-status="owed"] .dot { background: var(--sd-pir-red); animation: gds-pulse2 1.3s infinite; }
@keyframes gds-pulse2 { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
.gds-tile .t-st { font-family: var(--sd-mono); font-size: 8.5px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--sd-pir-ink3); }
.gds-tile h3 { font-size: 14.5px; font-weight: 500; line-height: 1.4; margin: 0; color: var(--sd-text); }
.gds-tile .meta { display: flex; gap: 9px; flex-wrap: wrap; margin-top: 9px; font-family: var(--sd-mono); font-size: 9px;
  letter-spacing: 0.1em; color: var(--sd-pir-ink3); text-transform: uppercase; }
.gds-tile .meta .sev1 { color: var(--sd-pir-red); }
.gds-tile .meta .sev2 { color: var(--sd-pir-core); }
.gds-tile .meta .ovr { color: var(--sd-pir-red); }
.gds-tile-enter-from, .gds-tile-leave-to { opacity: 0; transform: translateY(14px); }
.gds-tile-enter-active, .gds-tile-leave-active { transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1); }

.gds-empty-strip { margin-top: 18px; border: 1px dashed var(--sd-pir-brd2); border-radius: 16px; padding: 22px;
  text-align: center; color: var(--sd-pir-ink3); font-size: 13px; display: flex; gap: 14px; align-items: center; justify-content: center; }
.gds-empty-strip.ok { border-color: rgba(52, 211, 153, 0.3); color: var(--sd-pir-ink2); }
.gds-clear { cursor: pointer; border: 1px solid var(--sd-pir-brd2); background: none; color: var(--sd-pir-core);
  font-family: var(--sd-mono); font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; border-radius: 16px; padding: 8px 14px; }

/* ── owed ── */
.gds-owed-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 13px; }
.gds-owed-pane { border-radius: 16px; padding: 17px 18px; position: relative; overflow: hidden;
  background: var(--sd-pir-glass); backdrop-filter: blur(20px) saturate(150%); -webkit-backdrop-filter: blur(20px) saturate(150%);
  border: 1px solid rgba(239, 68, 68, 0.3); box-shadow: inset 0 1px 0 var(--sd-pir-spec);
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s;
  animation: gds-deal 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards; animation-delay: calc(var(--i, 0) * 70ms); }
.gds-owed-pane:hover { transform: translateY(-4px); box-shadow: inset 0 1px 0 var(--sd-pir-spec), 0 18px 40px rgba(0, 0, 0, 0.4); }
.gds-owed-pane h3 { font-size: 14.5px; font-weight: 500; margin: 0; color: var(--sd-text); }
.gds-owed-pane .meta { display: flex; gap: 9px; margin-top: 8px; font-family: var(--sd-mono); font-size: 9px;
  letter-spacing: 0.12em; color: var(--sd-pir-ink3); text-transform: uppercase; flex-wrap: wrap; }
.gds-owed-pane .meta .s1 { color: var(--sd-pir-red); font-weight: 700; }
.gds-owed-pane .meta .s2 { color: var(--sd-pir-core); font-weight: 700; }
.owed-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; }
.gds-age { display: inline-block; font-family: var(--sd-mono); font-size: 8.5px; letter-spacing: 0.18em;
  border-radius: 12px; padding: 5px 11px; text-transform: uppercase; border: 1px solid var(--sd-pir-brd); color: var(--sd-pir-ink2); }
.gds-age.warm { color: var(--sd-pir-core); border-color: var(--sd-pir-core); }
.gds-age.hot { color: var(--sd-pir-hot); border-color: var(--sd-pir-hot); background: var(--sd-pir-hot-soft); }
.gds-age.burn { color: var(--sd-pir-red); border-color: var(--sd-pir-red); background: rgba(239, 68, 68, 0.08); animation: gds-pulse2 1.8s infinite; }
.gds-open-rev { cursor: pointer; font-family: var(--sd-mono); font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase;
  border-radius: 18px; border: 1px solid var(--sd-pir-brd2); background: transparent; color: var(--sd-pir-core);
  padding: 9px 16px; transition: all 0.3s; }
.gds-open-rev:hover:not(:disabled) { background: linear-gradient(180deg, var(--sd-pir-hot), var(--sd-pir-deep));
  color: var(--sd-pir-btn-ink); transform: translateY(-2px); box-shadow: 0 8px 20px rgba(232, 176, 75, 0.3); border-color: transparent; }
.gds-open-rev:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── my actions ── */
.gds-actions-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 13px; }
.gds-acard { border-radius: 16px; padding: 15px 16px; position: relative; overflow: hidden;
  background: var(--sd-pir-glass); backdrop-filter: blur(18px) saturate(150%); -webkit-backdrop-filter: blur(18px) saturate(150%);
  border: 1px solid var(--sd-pir-brd); box-shadow: inset 0 1px 0 var(--sd-pir-spec);
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s, border-color 0.35s;
  animation: gds-deal 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards; animation-delay: calc(var(--i, 0) * 60ms); }
.gds-acard:hover { transform: translateY(-4px); box-shadow: inset 0 1px 0 var(--sd-pir-spec), 0 16px 36px rgba(0, 0, 0, 0.4);
  border-color: var(--sd-pir-brd2); }
.gds-acard.overdue { border-color: rgba(239, 68, 68, 0.45); }
.gds-acard.overdue::before { content: ''; position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(200px 80px at 18% 0%, rgba(239, 68, 68, 0.12), transparent); animation: gds-pulse2 2.4s infinite; }
.gds-acard h4 { font-size: 13.5px; font-weight: 500; line-height: 1.45; margin: 0; color: var(--sd-text); }
.gds-acard .src { font-family: var(--sd-mono); font-size: 8.5px; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--sd-pir-ink3); margin-top: 8px; }
.gds-acard .arow { display: flex; justify-content: space-between; align-items: center; margin-top: 13px; }
.gds-acard .due { font-size: 10px; color: var(--sd-pir-ink3); }
.gds-acard .due.over { color: var(--sd-pir-red); font-weight: 700; }
.gds-acard.done-card { opacity: 0.55; }
.gds-acard.done-card h4 { text-decoration: line-through; text-decoration-color: var(--sd-pir-em); }
.gds-pill { cursor: pointer; border: none; font-family: var(--sd-mono); font-size: 8.5px; letter-spacing: 0.14em;
  text-transform: uppercase; border-radius: 11px; padding: 5px 12px; transition: all 0.25s; white-space: nowrap; }
.gds-pill:hover:not(:disabled) { transform: translateY(-2px) scale(1.04); }
.gds-pill:disabled { cursor: not-allowed; opacity: 0.6; }
.gds-pill.open { background: rgba(255, 251, 240, 0.06); color: var(--sd-pir-ink2); border: 1px solid var(--sd-pir-brd2); }
.gds-pill.in_progress { background: var(--sd-pir-hot-soft); color: var(--sd-pir-hot); border: 1px solid var(--sd-pir-hot); }
.gds-pill.done { background: rgba(52, 211, 153, 0.14); color: var(--sd-pir-em); border: 1px solid var(--sd-pir-em); }
.gds-pill.overdue-ring { box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2); animation: gds-pulse2 2s infinite; }

/* ── lead tray ── */
.gds-tray { display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 15px; }
.gds-plate-card { border-radius: 18px; padding: 21px 22px; position: relative;
  background: var(--sd-pir-glass); backdrop-filter: blur(22px) saturate(155%); -webkit-backdrop-filter: blur(22px) saturate(155%);
  border: 1px solid var(--sd-pir-brd); box-shadow: inset 0 1px 0 var(--sd-pir-spec);
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s; }
.gds-plate-card:hover { transform: translateY(-4px); box-shadow: inset 0 1px 0 var(--sd-pir-spec), 0 22px 48px rgba(0, 0, 0, 0.42); }
.gds-plate-card .p-eyebrow { font-family: var(--sd-mono); font-size: 9px; letter-spacing: 0.24em; text-transform: uppercase;
  color: var(--sd-pir-core); margin: 0 0 8px; }
.gds-plate-card h3 { font-size: 17px; font-weight: 500; margin: 0; color: var(--sd-text); }
.gds-plate-card .p-meta { display: flex; gap: 11px; flex-wrap: wrap; margin-top: 8px; font-family: var(--sd-mono);
  font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--sd-pir-ink3); }
.gds-plate-card .p-meta .s1 { color: var(--sd-pir-red); }
.gds-plate-card .p-meta .s2 { color: var(--sd-pir-core); }
.p-verbs { display: flex; gap: 9px; margin-top: 15px; flex-wrap: wrap; }
.gds-dk-btn { cursor: pointer; font-family: var(--sd-mono); font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase;
  border-radius: 18px; padding: 10px 15px; border: 1px solid var(--sd-pir-em); background: transparent; color: var(--sd-pir-em);
  transition: all 0.3s; }
.gds-dk-btn:hover:not(:disabled) { background: var(--sd-pir-em-deep); border-color: var(--sd-pir-em-deep); color: #fff;
  transform: translateY(-2px); box-shadow: 0 8px 20px rgba(10, 122, 88, 0.3); }
.gds-dk-btn.rej { border-color: var(--sd-pir-red); color: var(--sd-pir-red); }
.gds-dk-btn.rej:hover:not(:disabled) { background: var(--sd-pir-red-deep); border-color: var(--sd-pir-red-deep); color: #fff;
  box-shadow: 0 8px 20px rgba(185, 28, 28, 0.3); }
.gds-dk-btn.ghost { border-color: var(--sd-pir-brd2); color: var(--sd-pir-ink2); }
.gds-dk-btn.ghost:hover { background: none; color: var(--sd-pir-core); border-color: var(--sd-pir-core); box-shadow: none; }
.gds-dk-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.gds-rej-note { margin-top: 11px; }
.gds-rej-note textarea { width: 100%; background: var(--sd-pir-field); border: 1px solid var(--sd-pir-brd);
  border-radius: 10px; font-family: inherit; font-size: 13px; color: var(--sd-text); line-height: 1.6; padding: 10px 13px; resize: vertical; }
.gds-rej-note textarea:focus { outline: none; border-color: var(--sd-pir-brd2); }
.gds-rej-note .rn-row { display: flex; justify-content: flex-end; margin-top: 8px; }
.gds-plate-card.locked .p-verbs { filter: grayscale(1); opacity: 0.35; pointer-events: none; }
.gds-four-eyes { margin-top: 15px; border: 1px dashed var(--sd-pir-red); border-radius: 12px; padding: 13px 15px;
  display: flex; gap: 12px; align-items: flex-start; background: rgba(239, 68, 68, 0.05); backdrop-filter: blur(8px); }
.gds-four-eyes :deep(svg) { flex: none; color: var(--sd-pir-red); margin-top: 2px; }
.gds-four-eyes .fe-t { font-family: var(--sd-mono); font-size: 8.5px; letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--sd-pir-red); font-weight: 700; }
.gds-four-eyes p { font-size: 12px; color: var(--sd-pir-ink2); margin: 4px 0 0; line-height: 1.55; }

/* ── footer ── */
.gds-foot { margin-top: 50px; padding: 22px 0 10px; border-top: 1px solid var(--sd-pir-brd);
  display: flex; justify-content: space-between; gap: 14px; flex-wrap: wrap;
  font-size: 9.5px; letter-spacing: 0.26em; text-transform: uppercase; color: var(--sd-pir-ink3); }
.gds-foot b { color: var(--sd-pir-core); }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .gds-orb,
  html:not([data-cinematic="on"]) .gds-schip,
  html:not([data-cinematic="on"]) .gds-tile,
  html:not([data-cinematic="on"]) .gds-owed-pane,
  html:not([data-cinematic="on"]) .gds-acard,
  html:not([data-cinematic="on"]) .gds-tile .dot,
  html:not([data-cinematic="on"]) .gds-age.burn { animation: none; }
}
</style>
