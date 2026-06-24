<template>
  <div class="ex-notice">
    <ExSectionHead :icon="CalendarClock" eyebrow="Exit Management · Separation" title="Notice Period" accent="Countdown"
      subtitle="Everyone serving notice on a single horizon — the closer the threshold, the faster the clock.">
      <template #actions>
        <div class="nf-tools">
          <label class="nf-search">
            <Search :size="14" />
            <input v-model="q" type="text" placeholder="Search name / code / dept…" />
            <button v-if="q" class="nf-clear" @click="q = ''" type="button"><X :size="13" /></button>
          </label>
          <ExSelect v-model="sortKey" :options="sortOpts" size="sm" class="nf-sort" />
          <Motion as="button" class="ex-btn ghost" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }"
            @click="load" type="button"><RefreshCw :size="15" :class="{ spin: loading }" /> Refresh</Motion>
        </div>
      </template>
      <template #lenses>
        <button v-for="l in lenses" :key="l.key" class="lens-chip" :class="{ on: activeLens === l.key, alert: l.alert && l.count }"
          @click="activeLens = l.key" type="button">
          <span class="lc-dot" :style="{ background: l.hex }" /><b>{{ l.count }}</b> {{ l.label }}
        </button>
      </template>
    </ExSectionHead>

    <!-- Concluded notices — exited / F&F settled employees that dropped off the
         active board. Keeps the HR admin informed about why they're no longer here. -->
    <Motion v-if="concluded.length" as="div" class="nc-concluded"
      :initial="{ opacity: 0, y: -8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, ease: [0.16,1,0.3,1] }">
      <div class="ncc-head">
        <span class="ncc-ic"><BadgeCheck :size="16" /></span>
        <div class="ncc-htxt">
          <b>{{ concluded.length }} notice period{{ concluded.length > 1 ? 's' : '' }} concluded</b>
          <span>These employees have exited or their full &amp; final settlement is closed — they're no longer serving notice and have left the board.</span>
        </div>
      </div>
      <div class="ncc-list">
        <div v-for="c in concluded" :key="c.case_id" class="ncc-row">
          <span class="ncc-av">{{ initials(c.employee_name) }}</span>
          <div class="ncc-mid">
            <b>{{ c.employee_name }}</b>
            <small><span class="ex-mono">{{ c.case_number }}</span> · {{ c.reason }}</small>
          </div>
          <button class="ncc-go" type="button" @click="$emit('go', { tab: 'settlement' })">Final settlement <ArrowUpRight :size="12" /></button>
        </div>
      </div>
    </Motion>

    <NoticeMeridian v-if="!loading && rows.length" :rows="rows" @pick="openDrawerById" />

    <div v-if="loading" class="grid-load"><Loader2 :size="22" class="spin" /> Loading the horizon…</div>
    <ExEmptyState v-else-if="!rows.length" :icon="CalendarClock" title="No one serving notice"
      subtitle="When a separation enters its notice period, it surfaces here with a live countdown on the Meridian." />
    <template v-else>
      <ExEmptyState v-if="!filteredRows.length" :icon="Filter" title="No cases match this lens"
        subtitle="Clear the search or pick a different lens to see the rest of the board." />
      <div v-else class="notice-list">
        <NoticeCard v-for="(r, i) in pagedRows" :key="r.case_id" :row="r" :index="i"
          @open="openDrawer" @adjust="openAction($event, 'adjust-notice')" @go="$emit('go', $event)" />
      </div>
      <ExPager :page="listPage" :total-pages="listPages" :total="listTotal" :limit="10" @update:page="listPage = $event" />
    </template>

    <ExCaseDrawer ref="drawerRef" :open="drawerOpen" :case-id="activeId" @close="drawerOpen = false"
      @action="onDrawerAction" @go="$emit('go', $event)" />
    <ExActionModal :open="modalOpen" :mode="modalMode" :busy="busy" :initial="activeRow" :subtitle="activeRow?.case_number || ''"
      @close="modalOpen = false" @submit="runAction" />
    <ExDecisionModal :open="decisionOpen" :mode="modalMode" :case-info="activeRow" :busy="busy"
      @close="decisionOpen = false" @submit="runAction" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { CalendarClock, RefreshCw, Loader2, Search, X, Filter, BadgeCheck, ArrowUpRight } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import ExSectionHead from '../components/ExSectionHead.vue'
import ExSelect from '../components/ExSelect.vue'
import ExEmptyState from '../components/ExEmptyState.vue'
import NoticeMeridian from '../components/NoticeMeridian.vue'
import NoticeCard from '../components/NoticeCard.vue'
import ExPager from '../components/ExPager.vue'
import ExCaseDrawer from '../drawers/ExCaseDrawer.vue'
import ExActionModal from '../modals/ExActionModal.vue'
import ExDecisionModal from '../modals/ExDecisionModal.vue'
import {
  fetchNoticeBoard, adjustNotice, waiveNotice, cancelCase, finalizeExit,
  startNotice, acceptCase, rejectCase, managerDecision, archiveCase, errText, useClientPage, initials,
} from '@/composables/useExit'

const props = defineProps({ initialFilter: { type: Object, default: null } })
const emit = defineEmits(['go', 'refresh-stats', 'consumed'])
const toast = useToast()

const rows = ref([])
const concluded = ref([])
const loading = ref(false)
const load = async () => {
  loading.value = true
  try {
    const d = await fetchNoticeBoard()
    rows.value = d.items || []
    concluded.value = d.concluded || []
    // Inform the HR admin when a stuck case was just reconciled off the board.
    const healed = concluded.value.filter(c => c.auto_completed)
    if (healed.length) {
      const who = healed.length === 1 ? `${healed[0].employee_name}'s notice period` : `${healed.length} notice periods`
      toast.success(`${who} concluded — employee exited & F&F settled`)
    }
  }
  catch (e) { toast.error(errText(e, 'Failed to load notice board')) }
  finally { loading.value = false }
}

// ── filtering / sorting ──────────────────────────────────────────────────────
const q = ref('')
const activeLens = ref('all')
const sortKey = ref('urgency')
const sortOpts = [
  { value: 'urgency', label: 'Sort · Urgency' },
  { value: 'clearance', label: 'Sort · Clearance' },
  { value: 'name', label: 'Sort · Name' },
]

const overdueCount = computed(() => rows.value.filter(r => r.overdue).length)
const soonCount = computed(() => rows.value.filter(r => !r.overdue && r.days_remaining != null && r.days_remaining <= 7).length)
const waivedCount = computed(() => rows.value.filter(r => r.notice_waived).length)

const lenses = computed(() => ([
  { key: 'all', label: 'serving notice', hex: 'var(--ex-violet)', count: rows.value.length },
  { key: 'overdue', label: 'overdue', hex: 'var(--ex-blocked)', count: overdueCount.value, alert: true },
  { key: 'soon', label: 'within 7 days', hex: 'var(--ex-ember)', count: soonCount.value, alert: true },
  { key: 'waived', label: 'notice waived', hex: 'var(--ex-amber)', count: waivedCount.value },
]))

const matchLens = (r) => {
  if (activeLens.value === 'overdue') return r.overdue
  if (activeLens.value === 'soon') return !r.overdue && r.days_remaining != null && r.days_remaining <= 7
  if (activeLens.value === 'waived') return r.notice_waived
  return true
}
const filteredRows = computed(() => {
  const term = q.value.trim().toLowerCase()
  let out = rows.value.filter(matchLens)
  if (term) out = out.filter(r => [r.employee_name, r.employee_code, r.case_number, r.department_name]
    .some(v => String(v || '').toLowerCase().includes(term)))
  const dd = (r) => (r.days_remaining == null ? 9999 : r.days_remaining)
  out = [...out]
  if (sortKey.value === 'urgency') out.sort((a, b) => dd(a) - dd(b))
  else if (sortKey.value === 'clearance') out.sort((a, b) => (a.clearance_progress_pct || 0) - (b.clearance_progress_pct || 0))
  else out.sort((a, b) => String(a.employee_name || '').localeCompare(String(b.employee_name || '')))
  return out
})
const { page: listPage, total: listTotal, totalPages: listPages, paged: pagedRows } = useClientPage(filteredRows, 10)
watch([q, activeLens, sortKey], () => { listPage.value = 1 })

// ── drawer + action modal ────────────────────────────────────────────────────
const drawerRef = ref(null); const drawerOpen = ref(false); const activeId = ref(null)
const activeRow = ref(null); const modalOpen = ref(false); const decisionOpen = ref(false); const modalMode = ref('adjust-notice'); const busy = ref(false)

// cancel / reject get the cinematic decision modal; everything else uses the action modal
const isDecision = (mode) => mode === 'cancel' || mode === 'reject'
const openDrawer = (r) => { activeId.value = r.case_id; activeRow.value = r; drawerOpen.value = true }
const openDrawerById = (id) => { const r = rows.value.find(x => x.case_id === id); if (r) openDrawer(r) }
const openAction = (r, mode) => { activeId.value = r.case_id; activeRow.value = r; modalMode.value = mode; (isDecision(mode) ? decisionOpen : modalOpen).value = true }
const onDrawerAction = ({ mode }) => { modalMode.value = mode; (isDecision(mode) ? decisionOpen : modalOpen).value = true }

const runAction = async (payload) => {
  busy.value = true
  const id = activeId.value
  try {
    const m = modalMode.value
    if (m === 'adjust-notice') await adjustNotice(id, payload)
    else if (m === 'waive-notice') await waiveNotice(id, payload)
    else if (m === 'cancel') await cancelCase(id, payload.reason)
    else if (m === 'start-notice') await startNotice(id, payload)
    else if (m === 'accept') await acceptCase(id, payload)
    else if (m === 'reject') await rejectCase(id, payload.reason)
    else if (m === 'manager-decision') await managerDecision(id, payload.decision, payload.notes)
    else if (m === 'finalize-exit') await finalizeExit(id, payload)
    else if (m === 'archive') await archiveCase(id)
    toast.success('Done')
    modalOpen.value = false
    decisionOpen.value = false
    await load()
    if (drawerOpen.value) drawerRef.value?.reload()
    emit('refresh-stats')
  } catch (e) { toast.error(errText(e, 'Action failed')) }
  finally { busy.value = false }
}

onMounted(async () => {
  const f = props.initialFilter
  if (f && (f.urgency || f.lens)) { activeLens.value = f.urgency || f.lens; emit('consumed') }
  await load()
})
</script>

<style scoped>
.ex-notice { color: var(--ex-text); display: flex; flex-direction: column; gap: 16px; }
.nf-tools { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.nf-search { display: inline-flex; align-items: center; gap: 7px; padding: 0 10px; height: 36px; border-radius: 10px;
  background: rgba(0,0,0,0.3); border: 1px solid var(--ex-border); color: var(--ex-text-dim); transition: border-color 0.25s; }
.nf-search:focus-within { border-color: var(--ex-violet-border); box-shadow: 0 0 0 3px rgba(251,146,60,0.12); }
.nf-search input { width: 168px; background: none; border: none; outline: none; color: var(--ex-text); font-size: 12.5px; font-family: inherit; }
.nf-search input::placeholder { color: var(--ex-text-dim); }
.nf-clear { display: grid; place-items: center; width: 18px; height: 18px; border-radius: 6px; border: none; cursor: pointer; background: var(--ex-steel-soft); color: var(--ex-text-muted); }
.nf-sort { min-width: 150px; }
[data-theme="light"] .nf-search { background: rgba(255,250,242,0.72); }
.ex-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid var(--ex-border-strong); background: transparent; color: var(--ex-text); }

.lens-chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; font-size: 12px; cursor: pointer;
  background: var(--ex-surface); border: 1px solid var(--ex-border); color: var(--ex-text-secondary); transition: all 0.2s var(--ex-spring); }
.lens-chip:hover { transform: translateY(-1px); border-color: var(--ex-border-strong); }
.lens-chip.on { border-color: var(--ex-violet-border); background: var(--ex-violet-soft); color: var(--ex-text); }
.lens-chip.alert.on { border-color: color-mix(in srgb, var(--ex-blocked) 40%, transparent); }
.lens-chip b { font-family: var(--ex-mono); color: var(--ex-text); }
.lc-dot { width: 8px; height: 8px; border-radius: 50%; }

/* concluded (exited / settled) notice banner */
.nc-concluded { border-radius: 16px; padding: 14px 16px; overflow: hidden;
  background: color-mix(in srgb, var(--ex-cleared) 9%, var(--ex-surface));
  border: 1px solid color-mix(in srgb, var(--ex-cleared) 30%, transparent); }
.ncc-head { display: flex; align-items: flex-start; gap: 11px; }
.ncc-ic { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0;
  color: var(--ex-cleared); background: color-mix(in srgb, var(--ex-cleared) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--ex-cleared) 30%, transparent); }
.ncc-htxt { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.ncc-htxt b { font-size: 13.5px; font-weight: 800; color: var(--ex-text); }
.ncc-htxt span { font-size: 12px; color: var(--ex-text-muted); line-height: 1.5; }
.ncc-list { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
.ncc-row { display: flex; align-items: center; gap: 10px; padding: 9px 11px; border-radius: 11px;
  background: var(--ex-surface); border: 1px solid var(--ex-border); }
.ncc-av { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0;
  font-size: 11px; font-weight: 800; color: var(--ex-cleared);
  background: color-mix(in srgb, var(--ex-cleared) 13%, transparent); border: 1px solid color-mix(in srgb, var(--ex-cleared) 26%, transparent); }
.ncc-mid { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
.ncc-mid b { font-size: 13px; font-weight: 700; color: var(--ex-text); }
.ncc-mid small { font-size: 11px; color: var(--ex-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ncc-go { display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0; padding: 6px 11px; border-radius: 9px; cursor: pointer;
  font-size: 11.5px; font-weight: 700; background: transparent; color: var(--ex-cleared);
  border: 1px solid color-mix(in srgb, var(--ex-cleared) 32%, transparent); transition: background 0.2s, transform 0.18s; }
.ncc-go:hover { transform: translateY(-1px); background: color-mix(in srgb, var(--ex-cleared) 12%, transparent); }

.notice-list { display: flex; flex-direction: column; gap: 12px; }
.grid-load { display: flex; align-items: center; gap: 8px; justify-content: center; padding: 50px; color: var(--ex-text-muted); }
.spin { animation: ex-spin-slow 0.8s linear infinite; }
@media (max-width: 700px) { .nf-tools { width: 100%; } .nf-search input { width: 100%; } .nf-search { flex: 1; } }
@media (prefers-reduced-motion: reduce) { .spin { animation: none; } .lens-chip { transition: none; } }
</style>
