<template>
  <!-- ACTIVE INCIDENTS — "THE BEAM". Command-bar-first response floor: a glass omnibar
       pours a light beam onto the sealed board; lens tokens and free text filter
       SERVER-SIDE (page/flag/sev/q — utils.incidents.flag_condition keeps chip counts ⇔
       row results in lockstep), the full incident-command verb rail rides every row,
       and bulk ack runs through the idempotent /tickets/bulk action. -->
  <section class="ibx">
    <!-- ░░ HERO — editorial light field + the omnibar (artifact-faithful: no box) ░░ -->
    <Motion as="header" class="ibx-hero"
      :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
      <div class="hero-lead">
        <p class="hero-eyebrow sd-mono"><i class="rule" aria-hidden="true" />FAULT GRID · THE BEAM<i class="rule" aria-hidden="true" /></p>
        <h2 class="hero-title">{{ total }} live fault{{ total === 1 ? '' : 's' }}.
          <em>Zero clicks to the worst one.</em></h2>
      </div>
      <SdIncBeamBar ref="beamRef" v-model="q" :tokens="activeTokens" :stats="stats"
        :count="total" :shown="rows.length"
        @try-token="tryToken" @remove-token="removeToken" @clear="clearAll"
        @nav="navSel" @open="openSel" />
    </Motion>

    <!-- the beam shaft — a diagonal light streak from the bar down across the board -->
    <span class="beam-shaft" :class="{ flash: shaftFlash }" aria-hidden="true" />

    <!-- ░░ LENS RAIL + TOOLBAR ░░ -->
    <div class="ibx-bar">
      <div class="lenses" role="tablist" aria-label="Board lenses">
        <button v-for="(c, i) in lensChips" :key="c.key" class="lens sd-mono"
          :class="[{ on: c.on, hot: c.hot }]" :style="{ '--i': i }" role="tab" :aria-selected="c.on"
          @click="applyLens(c)">
          {{ c.label }} <b>{{ c.count }}</b><span class="l-bar" aria-hidden="true" />
        </button>
      </div>
      <div class="tools">
        <SdSelect v-model="fStatus" :options="statusOptions" class="tool-sel" aria-label="Status filter" />
        <SdSelect v-model="fService" :options="serviceOptions" class="tool-sel" aria-label="Service filter" />
        <div class="tool-dock" role="group" aria-label="Board tools">
          <button class="tool" :class="{ on: view === 'table' }" :title="view === 'table' ? 'Beam rows' : 'Dense table'"
            :aria-pressed="view === 'table'"
            @click="view = view === 'table' ? 'beam' : 'table'"><Table2 :size="15" /></button>
          <button class="tool" :class="{ on: selectMode }" title="Select for bulk ack" :aria-pressed="selectMode"
            @click="toggleSelectMode"><CheckSquare :size="15" /></button>
          <button class="tool" title="Refresh" @click="refresh(false)">
            <RefreshCw :size="15" :class="{ spin: loading }" /></button>
        </div>
      </div>
    </div>

    <!-- ░░ THE BOARD ░░ -->
    <div class="ibx-board">
      <SdIncBeamRows v-if="view === 'beam'" :rows="rows" :now="now" :loading="loading"
        :selectable="selectMode" :selected="selected" :sel-index="selIndex" :empty="emptyText"
        @open="id => $emit('open', id)" @toggle="toggleSel"
        @ack="ackOne" @update="openModal('update', $event)" @bridge="joinBridge"
        @roster="openRoster" @decision="openModal('decision', $event)"
        @declare="openModal('declare', $event)" @link="openModal('link', $event)" @war="toWarRoom">
        <template #empty-actions>
          <div v-if="hasFilters" class="empty-clears">
            <button v-for="f in activeFilterChips" :key="f.key" class="clear-chip sd-mono" @click="f.clear()">
              <X :size="10" /> {{ f.label }}</button>
          </div>
        </template>
      </SdIncBeamRows>

      <SdIncBoard v-else :rows="rows" :now="now" :loading="loading" :selectable="selectMode"
        :selected="selected" :empty="emptyText"
        @open="id => $emit('open', id)" @toggle="toggleSel" @toggle-all="toggleAll"
        @sort="onSort" @ack="ackOne" @war="toWarRoom">
        <template #actions="{ row }">
          <button v-if="!row.acknowledged_at && row.sev <= 2" class="tact ack" title="Acknowledge"
            @click="ackOne(row)"><ShieldCheck :size="13" /></button>
          <button class="tact" title="Post update" @click="openModal('update', row)"><MessageSquare :size="13" /></button>
          <button class="tact" title="Open" @click="$emit('open', row.id)"><ArrowRight :size="13" /></button>
        </template>
      </SdIncBoard>
    </div>

    <SdIncPager :page="page" :total="total" :limit="LIMIT" @update:page="page = $event" />

    <!-- ░░ FOOTER STRIP ░░ -->
    <footer class="ibx-foot sd-mono">
      <span>FAULT GRID / ACTIVE INCIDENTS · <em>SEALED TO YOUR COMMAND SCOPE</em></span>
      <span>{{ stats?.new_today || 0 }} NEW TODAY · {{ stats?.resolved_today || 0 }} RESOLVED ·
        MTTR {{ stats?.mttr_minutes_current_month ? Math.round(stats.mttr_minutes_current_month) + 'm' : '—' }}
        <em v-if="stats?.mttr_trend_pct != null">({{ stats.mttr_trend_pct > 0 ? '+' : '' }}{{ stats.mttr_trend_pct }}% M/M)</em></span>
    </footer>

    <!-- ░░ BULK BAR ░░ -->
    <Transition name="bulk">
      <div v-if="selected.length" class="bulk sd-card">
        <span class="sd-mono">{{ selected.length }} SELECTED</span>
        <Motion as="button" class="bulk-ack" :disabled="busy" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.96 }"
          @click="ackSelected"><ShieldCheck :size="13" /> Acknowledge {{ selected.length }}</Motion>
        <button class="bulk-clear" @click="selected = []"><X :size="12" /> Clear</button>
      </div>
    </Transition>

    <!-- ░░ COMMAND MODALS (the same consoles the Major/Critical desks use) ░░ -->
    <SdIncUpdateModal :open="modal === 'update'" :ticket="target" @close="modal = null" @done="onDone" />
    <SdIncRolesModal :open="modal === 'roster'" :ticket="target"
      @close="modal = null" @done="onDone" />
    <SdIncDecisionModal :open="modal === 'decision'" :ticket="target" @close="modal = null" @done="onDone" />
    <SdMajorIncidentModal :open="modal === 'declare'" :ticket="target" :agent="true"
      @close="modal = null" @done="onDone" />
    <SdIncLinkModal :open="modal === 'link'" :ticket="target" @close="modal = null" @done="onDone" />
  </section>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  RefreshCw, X, Table2, CheckSquare, ShieldCheck, MessageSquare, ArrowRight,
} from 'lucide-vue-next'
import SdIncBeamBar from '../components/SdIncBeamBar.vue'
import SdIncBeamRows from '../components/SdIncBeamRows.vue'
import SdIncBoard from '../components/SdIncBoard.vue'
import SdIncPager from '../components/SdIncPager.vue'
import SdSelect from '../components/SdSelect.vue'
import SdIncUpdateModal from '../modals/SdIncUpdateModal.vue'
import SdIncRolesModal from '../modals/SdIncRolesModal.vue'
import SdIncDecisionModal from '../modals/SdIncDecisionModal.vue'
import SdMajorIncidentModal from '../modals/SdMajorIncidentModal.vue'
import SdIncLinkModal from '../modals/SdIncLinkModal.vue'
import {
  listIncidents, fetchIncidentStats, ackTicket, bulkAck, normalizeIncidentRow,
} from '@/composables/useSupportDesk'

const props = defineProps({
  panel: { type: String, default: 'admin' },
  // part of the workspace's ticket-tool contract; gating is the registry's job (agentOnly)
  agentReveal: { type: Boolean, default: false },
})
const emit = defineEmits(['open'])
const route = useRoute()
const router = useRouter()
const toast = useToast()
const base = computed(() => (props.panel === 'employee' ? '/user/support' : '/admin/support-desk'))

/* ── server-driven state ── */
const LIMIT = 20
const rows = ref([])
const total = ref(0)
const page = ref(1)
const stats = ref(null)
const loading = ref(false)
const busy = ref(false)
const now = ref(Date.now())
const q = ref('')
const sevToken = ref(null)          // 1 | 2 (SEV lenses)
const flagToken = ref(null)         // unacked | at_risk | breached | unowned | cmdr_unstaffed | update_overdue
const fStatus = ref('')
const fService = ref('')
const sortKey = ref(null)
const sortDir = ref('desc')
const view = ref('beam')
const selectMode = ref(false)
const selected = ref([])
const selIndex = ref(-1)
const beamRef = ref(null)
const shaftFlash = ref(false)
let tick = null, poll = null, qTimer = null, knownIds = new Set()

const params = () => ({
  lens: 'active', page: page.value, limit: LIMIT,
  q: q.value.trim() || undefined,
  sev: sevToken.value || undefined,
  flag: flagToken.value || undefined,
  status: fStatus.value || undefined,
  service: fService.value || undefined,
  sort_by: sortKey.value || undefined,
  sort_dir: sortKey.value ? sortDir.value : undefined,
})

const refresh = async (silent = true) => {
  if (!silent) loading.value = true
  try {
    const [list, st] = await Promise.all([listIncidents(params()), fetchIncidentStats()])
    const items = (list.items || []).map(normalizeIncidentRow)
    // arrivals ride the beam in — flash only on silent polls once the board is known
    if (silent && knownIds.size && items.some(r => !knownIds.has(String(r.id)))) {
      beamRef.value?.flashBeam()
      shaftFlash.value = true
      setTimeout(() => { shaftFlash.value = false }, 900)
    }
    knownIds = new Set(items.map(r => String(r.id)))
    rows.value = items
    total.value = list.total || 0
    stats.value = st
    selIndex.value = Math.min(selIndex.value, items.length - 1)
    // clamp: a shrinking board must never strand the pager past the last page
    const maxPage = Math.max(1, Math.ceil(total.value / LIMIT))
    if (page.value > maxPage) page.value = maxPage
  } catch { /* surfaced by the board's empty/loading states */ }
  finally { loading.value = false }
}

/* ── lens tokens (the beam bar's vocabulary) ── */
const TOKEN_DEFS = {
  sev1: { kind: 'sev', v: 1 }, sev2: { kind: 'sev', v: 2 },
  sev3: { kind: 'sev', v: 3 }, sev4: { kind: 'sev', v: 4 },
  unacked: { kind: 'flag', v: 'unacked' },
  at_risk: { kind: 'flag', v: 'at_risk' }, 'at-risk': { kind: 'flag', v: 'at_risk' },
  risk: { kind: 'flag', v: 'at_risk' },
  breached: { kind: 'flag', v: 'breached' },
  unowned: { kind: 'flag', v: 'unowned' },
  cmdr: { kind: 'flag', v: 'cmdr_unstaffed' }, cmdr_unstaffed: { kind: 'flag', v: 'cmdr_unstaffed' },
  overdue: { kind: 'flag', v: 'update_overdue' }, update_overdue: { kind: 'flag', v: 'update_overdue' },
}
const FLAG_LABELS = {
  unacked: 'UNACKED', at_risk: 'AT RISK', breached: 'BREACHED', unowned: 'UNOWNED',
  cmdr_unstaffed: 'CMDR UNSTAFFED', update_overdue: 'UPDATE OVERDUE',
}
const activeTokens = computed(() => {
  const out = []
  if (sevToken.value) out.push({ key: `sev:${sevToken.value}`, label: `SEV${sevToken.value}`,
    tone: sevToken.value === 1 ? 'hot' : 'warn' })
  if (flagToken.value) out.push({ key: `flag:${flagToken.value}`, label: FLAG_LABELS[flagToken.value],
    tone: flagToken.value === 'breached' ? 'hot' : 'warn' })
  return out
})
const tryToken = (word, done) => {
  const def = TOKEN_DEFS[word]
  if (!def) { done(false); return }
  if (def.kind === 'sev') sevToken.value = def.v
  else flagToken.value = def.v
  q.value = ''
  done(true)
}
const removeToken = (key) => {
  if (key.startsWith('sev:')) sevToken.value = null
  else flagToken.value = null
}
const clearAll = () => {
  q.value = ''; sevToken.value = null; flagToken.value = null
  fStatus.value = ''; fService.value = ''
}

/* ── lens rail: counts from /incidents/stats — the same predicates the list filters with ── */
const lensChips = computed(() => {
  const s = stats.value || {}
  return [
    { key: 'all', label: 'ALL', count: s.active_total || 0, on: !sevToken.value && !flagToken.value },
    { key: 'sev1', label: 'SEV1', count: s.by_sev?.sev1 || 0, on: sevToken.value === 1, hot: true },
    { key: 'sev2', label: 'SEV2', count: s.by_sev?.sev2 || 0, on: sevToken.value === 2 },
    { key: 'unacked', label: 'UNACKED', count: s.unacked || 0, on: flagToken.value === 'unacked' },
    { key: 'at_risk', label: 'AT RISK', count: s.sla?.at_risk || 0, on: flagToken.value === 'at_risk' },
    { key: 'breached', label: 'BREACHED', count: s.sla?.breached || 0, on: flagToken.value === 'breached', hot: true },
    { key: 'unowned', label: 'UNOWNED', count: s.unowned || 0, on: flagToken.value === 'unowned' },
    { key: 'cmdr_unstaffed', label: 'CMDR', count: s.roles_unassigned || 0, on: flagToken.value === 'cmdr_unstaffed' },
    { key: 'update_overdue', label: 'UPD OVERDUE', count: s.update_overdue || 0, on: flagToken.value === 'update_overdue' },
  ]
})
const applyLens = (c) => {
  if (c.key === 'all') { sevToken.value = null; flagToken.value = null }
  else if (c.key === 'sev1') sevToken.value = sevToken.value === 1 ? null : 1
  else if (c.key === 'sev2') sevToken.value = sevToken.value === 2 ? null : 2
  else flagToken.value = flagToken.value === c.key ? null : c.key
}

/* ── selects ── */
const statusOptions = computed(() => [
  { value: '', label: 'Any status' },
  ...['open', 'in_progress', 'pending_customer', 'pending_vendor', 'on_hold', 'escalated']
    .map(s => ({ value: s, label: s.replace(/_/g, ' ') })),
])
const serviceOptions = computed(() => {
  // stats.top_services keeps a deep-linked ?service= visible even when the current page
  // has no matching rows (the old board stranded that filter with an empty select)
  const names = new Set((stats.value?.top_services || []).map(s => s.service))
  if (fService.value) names.add(fService.value)
  return [{ value: '', label: 'Any service' },
    ...[...names].sort().map(s => ({ value: s, label: s }))]
})

/* ── filters → refetch (debounced text; page resets on every filter change) ── */
watch(q, () => { clearTimeout(qTimer); qTimer = setTimeout(() => { page.value = 1; refresh(false) }, 300) })
watch([sevToken, flagToken, fStatus, fService], () => { page.value = 1; selIndex.value = -1; refresh(false) })
watch(page, () => refresh(false))
const onSort = (key) => {
  if (sortKey.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortKey.value = key; sortDir.value = 'asc' }
  refresh(false)
}

/* ── deep links (?lens= / ?q= / ?service= from the dashboard) ── */
watch(() => route.query, (query) => {
  if (query.lens) {
    const def = TOKEN_DEFS[String(query.lens)]
    if (def) (def.kind === 'sev' ? (sevToken.value = def.v) : (flagToken.value = def.v))
  }
  if (query.q) q.value = String(query.q)
  if (query.service) fService.value = String(query.service)
}, { immediate: true })

/* ── keyboard from the bar: the selection ring the beam follows ── */
const navSel = (dir) => {
  if (!rows.value.length) return
  selIndex.value = Math.max(0, Math.min(rows.value.length - 1,
    (selIndex.value < 0 ? -dir : selIndex.value) + dir))
}
const openSel = () => {
  const r = rows.value[selIndex.value >= 0 ? selIndex.value : 0]
  if (r) emit('open', r.id)
}

/* ── verbs ── */
const modal = ref(null)      // 'update' | 'roster' | 'decision' | 'declare' | 'link'
const target = ref(null)
const openModal = (kind, r) => { target.value = r; modal.value = kind }
// The roles modal self-hydrates its pool from the sealed /roster-candidates read —
// the old listMyTeam() pool here was DIRECT REPORTS, empty for most agents.
const openRoster = (r) => { target.value = r; modal.value = 'roster' }
const onDone = () => { modal.value = null; refresh(true) }
const ackOne = async (r) => {
  try {
    await ackTicket(r.id)
    toast.success(`${r.ticket_number} acknowledged — MTTA clock stopped`)
    refresh(true)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not acknowledge') }
}
const joinBridge = (r) => { if (r.war_room_url) window.open(r.war_room_url, '_blank', 'noopener') }
const toWarRoom = (r) => router.push({ path: `${base.value}/incidents/major`, query: { focus: r.id } })

/* ── bulk ack (idempotent server-side; skips come back with reasons) ── */
const toggleSelectMode = () => { selectMode.value = !selectMode.value; if (!selectMode.value) selected.value = [] }
const toggleSel = (id) => {
  const i = selected.value.indexOf(id)
  i >= 0 ? selected.value.splice(i, 1) : selected.value.push(id)
}
const toggleAll = () => {
  selected.value = selected.value.length === rows.value.length ? [] : rows.value.map(r => String(r.id))
}
const ackSelected = async () => {
  busy.value = true
  try {
    const res = await bulkAck([...selected.value])
    const skipped = (res.results || []).filter(x => x.skipped || x.ok === false)
    const why = skipped[0]?.error ? ` — first skip: ${skipped[0].error}` : ''
    if (res.updated) toast.success(`${res.updated} acknowledged${skipped.length ? `, ${skipped.length} skipped${why}` : ''}`)
    else toast.info(`Nothing to do — ${skipped.length} skipped${why}`)
    selected.value = []
    refresh(true)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Bulk acknowledge failed') }
  finally { busy.value = false }
}

/* ── empty state names its filters ── */
const hasFilters = computed(() => !!(q.value || sevToken.value || flagToken.value || fStatus.value || fService.value))
const activeFilterChips = computed(() => {
  const out = []
  if (q.value) out.push({ key: 'q', label: `"${q.value}"`, clear: () => { q.value = '' } })
  if (sevToken.value) out.push({ key: 'sev', label: `SEV${sevToken.value}`, clear: () => { sevToken.value = null } })
  if (flagToken.value) out.push({ key: 'flag', label: FLAG_LABELS[flagToken.value], clear: () => { flagToken.value = null } })
  if (fStatus.value) out.push({ key: 'status', label: fStatus.value.replace(/_/g, ' '), clear: () => { fStatus.value = '' } })
  if (fService.value) out.push({ key: 'service', label: fService.value, clear: () => { fService.value = '' } })
  return out
})
const emptyText = computed(() => (hasFilters.value
  ? 'Nothing in the light — clear a filter to widen the beam.'
  : 'No live faults — the desk holds.'))

/* ── lifecycle: 1s clock + visibility-gated 60s poll that never resets filters/selection ── */
onMounted(() => {
  refresh(false)
  tick = setInterval(() => { now.value = Date.now() }, 1000)
  poll = setInterval(() => { if (!document.hidden && !modal.value) refresh(true) }, 60000)
})
onBeforeUnmount(() => { clearInterval(tick); clearInterval(poll); clearTimeout(qTimer) })
</script>

<style scoped>
.ibx { position: relative; display: flex; flex-direction: column; gap: 16px; isolation: isolate; }
/* the light field — full-bleed warm glow behind everything (artifact: no boxed hero) */
.ibx::before { content: ''; position: absolute; inset: -30px -30px auto; height: 560px; z-index: -2;
  pointer-events: none;
  background:
    radial-gradient(58% 46% at 50% 6%, var(--sd-inc-soft), transparent 72%),
    radial-gradient(34% 30% at 72% 20%, color-mix(in srgb, var(--sd-inc-core) 9%, transparent), transparent 78%); }

/* the beam shaft — a diagonal streak from the bar's edge sweeping down across the board */
.beam-shaft { position: absolute; z-index: -1; top: 208px; left: 50%; width: min(58vw, 820px); height: 480px;
  pointer-events: none; transform-origin: 0 0; transform: rotate(24deg);
  background: linear-gradient(180deg,
    color-mix(in srgb, var(--sd-inc-hi) 26%, transparent),
    color-mix(in srgb, var(--sd-inc-core) 10%, transparent) 45%, transparent 82%);
  -webkit-mask-image: linear-gradient(90deg, #000, transparent 88%);
          mask-image: linear-gradient(90deg, #000, transparent 88%);
  filter: blur(26px); opacity: 0.5; animation: shaft-breathe 4.2s ease-in-out infinite;
  transition: opacity 0.5s; }
.beam-shaft.flash { opacity: 0.95; }
@keyframes shaft-breathe { 0%, 100% { opacity: 0.42; } 50% { opacity: 0.6; } }

/* ── hero (open field, editorial) ── */
.ibx-hero { position: relative; padding: 34px 10px 6px; }
.hero-lead { position: relative; text-align: center; margin-bottom: 26px; }
.hero-eyebrow { display: inline-flex; align-items: center; gap: 14px; margin: 0 0 18px; font-size: 9.5px;
  font-weight: 800; letter-spacing: 0.24em; color: var(--sd-inc-core); }
.hero-eyebrow .rule { width: 46px; height: 1px; background: linear-gradient(90deg, transparent, var(--sd-inc-core));
  font-style: normal; }
.hero-eyebrow .rule:last-child { background: linear-gradient(90deg, var(--sd-inc-core), transparent); }
.hero-title { margin: 0 auto; max-width: 22ch; font-size: clamp(34px, 4.6vw, 60px); font-weight: 230;
  letter-spacing: -0.022em; line-height: 1.08; color: var(--sd-text); text-wrap: balance; }
.hero-title em { font-style: normal; font-weight: 560; background: var(--sd-inc-grad);
  -webkit-background-clip: text; background-clip: text; color: transparent; }

/* ── lens rail + tools ── */
.ibx-bar { display: flex; gap: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
.lenses { display: flex; gap: 6px; flex-wrap: wrap; }
.lens { position: relative; display: inline-flex; align-items: baseline; gap: 6px; padding: 8px 12px;
  border-radius: 11px; cursor: pointer; font-size: 9.5px; font-weight: 800; letter-spacing: 0.1em;
  color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border);
  animation: sd-deal 0.45s var(--sd-spring) both; animation-delay: calc(var(--i) * 0.04s);
  transition: transform 0.25s var(--sd-spring), color 0.25s, border-color 0.25s, background 0.25s; }
.lens b { font-weight: 350; font-size: 14.5px; color: var(--sd-text); font-family: var(--sd-mono); }
.lens.hot b { color: var(--sd-inc-arc); }
.lens .l-bar { position: absolute; left: 11px; right: 11px; bottom: 4px; height: 2px; border-radius: 2px;
  background: var(--sd-inc-grad); transform: scaleX(0); transform-origin: left;
  transition: transform 0.3s var(--sd-spring); }
.lens:hover { transform: translateY(-2px); color: var(--sd-text); }
.lens:hover .l-bar { transform: scaleX(1); }
.lens.on { color: var(--sd-text); background: var(--sd-inc-soft); border-color: var(--sd-inc-brd); }
.lens.on .l-bar { transform: scaleX(1); }
.lens:focus-visible { outline: 2px solid var(--sd-inc-core); outline-offset: 2px; }
.tools { display: flex; gap: 9px; align-items: stretch; }
.tool-sel { min-width: 132px; }
/* segmented dock — same material as the SdSelect capsules beside it, so the three
   verbs read as one deliberate instrument instead of loose glyphs on the field */
.tool-dock { display: flex; align-items: stretch; border-radius: 12px; overflow: hidden;
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); }
.tool { position: relative; display: grid; place-items: center; width: 41px; min-height: 40px;
  cursor: pointer; color: var(--sd-text-secondary); background: transparent; border: 0;
  transition: color 0.22s, background 0.22s; }
.tool + .tool { border-left: 1px solid var(--sd-border-strong); }
.tool:hover { color: var(--sd-inc-core); background: var(--sd-inc-soft); }
.tool.on { color: var(--sd-inc-core); background: var(--sd-inc-soft);
  box-shadow: inset 0 -2px 0 var(--sd-inc-core); }
.tool:focus-visible { outline: 2px solid var(--sd-inc-core); outline-offset: -2px; }
.tool .spin { animation: sd-spin-slow 1.1s linear infinite; }

/* ── board shell — a whisper of a container: hairlines on the open field ── */
.ibx-board { overflow: hidden; border-radius: 16px; border: 1px solid var(--sd-border);
  background: color-mix(in srgb, var(--sd-surface) 42%, transparent);
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
.empty-clears { display: flex; gap: 7px; flex-wrap: wrap; justify-content: center; }
.clear-chip { display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 999px;
  cursor: pointer; font-size: 9.5px; font-weight: 800; letter-spacing: 0.08em;
  color: var(--sd-inc-core); background: var(--sd-inc-soft); border: 1px solid var(--sd-inc-brd);
  transition: all 0.2s var(--sd-spring); }
.clear-chip:hover { transform: translateY(-2px); color: var(--sd-inc-arc); border-color: var(--sd-inc-arc); }

/* table-mode compact actions (SdIncBoard #actions slot) */
.tact { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 9px; cursor: pointer;
  color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border);
  transition: all 0.2s var(--sd-spring); }
.tact:hover { transform: translateY(-2px); color: var(--sd-inc-core); border-color: var(--sd-inc-core); }
.tact.ack { color: var(--sd-inc-live); }

/* ── bulk bar ── */
.bulk { position: sticky; bottom: 14px; z-index: 30; display: flex; align-items: center; gap: 14px;
  padding: 11px 16px; border: 1px solid var(--sd-inc-brd);
  background: color-mix(in srgb, var(--sd-surface-elevated) 88%, transparent);
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 18px 50px -20px rgba(0, 0, 0, 0.6); }
[data-theme="light"] .bulk { background: rgba(255, 250, 240, 0.9); }
.bulk > span { font-size: 10px; letter-spacing: 0.14em; font-weight: 800; color: var(--sd-inc-core); }
.bulk-ack { display: inline-flex; align-items: center; gap: 7px; padding: 9px 15px; border-radius: 11px;
  cursor: pointer; font: inherit; font-size: 12px; font-weight: 800; color: #1a1206;
  background: var(--sd-inc-grad); border: 0; box-shadow: 0 8px 20px var(--sd-inc-soft); }
[data-theme="light"] .bulk-ack { color: #fff8ec; }
.bulk-ack:disabled { opacity: 0.6; cursor: default; }
.bulk-clear { display: inline-flex; align-items: center; gap: 5px; margin-left: auto; padding: 8px 12px;
  border-radius: 10px; cursor: pointer; font: inherit; font-size: 11px; font-weight: 700;
  color: var(--sd-text-secondary); background: transparent; border: 1px solid var(--sd-border); }
.bulk-enter-active, .bulk-leave-active { transition: all 0.35s var(--sd-spring); }
.bulk-enter-from, .bulk-leave-to { opacity: 0; transform: translateY(16px); }

/* ── footer strip ── */
.ibx-foot { display: flex; justify-content: space-between; gap: 14px; flex-wrap: wrap;
  padding: 16px 4px 6px; border-top: 1px solid var(--sd-border);
  font-size: 8.5px; letter-spacing: 0.18em; color: var(--sd-text-muted); }
.ibx-foot em { font-style: normal; color: var(--sd-inc-core); }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .lens,
  html:not([data-cinematic="on"]) .beam-shaft,
  html:not([data-cinematic="on"]) .tool .spin { animation: none !important; }
}
</style>
