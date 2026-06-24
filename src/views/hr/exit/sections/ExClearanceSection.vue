<template>
  <div class="ex-clear">
    <ClearanceConsole :roster="roster" :active-lens="activeLens" :loading="loadingCases || loadingRoster"
      @pick="pickLens" @refresh="loadAll" @go="$emit('go', $event)" />

    <!-- loading -->
    <div v-if="loadingCases && !roster.length" class="clr-skel">
      <div v-for="n in 3" :key="n" class="skel"><span class="skel-shimmer" /></div>
    </div>

    <ExEmptyState v-else-if="!roster.length" :icon="ClipboardCheck" title="No cases in clearance"
      subtitle="Accept a resignation and start notice — the clearance checklist seeds automatically and walks onto the gatehouse here." />

    <template v-else>
      <!-- roster strip -->
      <div class="roster">
        <div class="roster-cap">
          <span class="rc-title"><Users :size="13" /> Clearance queue</span>
          <span class="rc-count ex-mono">{{ filteredRoster.length }}<i v-if="activeLens && activeLens !== 'all'"> · {{ lensLabel }}</i></span>
          <button v-if="activeLens && activeLens !== 'all'" class="rc-clear" type="button" @click="pickLens('all')"><X :size="12" /> Clear</button>
        </div>
        <div class="roster-strip" :class="{ empty: !filteredRoster.length }">
          <ClearanceCaseChip v-for="(c, i) in pagedRoster" :key="c.id" :c="c" :index="i" :active="c.id === activeId" @select="selectCase" />
          <div v-if="!filteredRoster.length" class="roster-empty">
            <Filter :size="15" /> No cases match this lens · <button type="button" @click="pickLens('all')">show all</button>
          </div>
        </div>
        <ExPager :page="rosterPage" :total-pages="rosterPages" :total="rosterTotal" :limit="10" @update:page="rosterPage = $event" />
      </div>

      <!-- stage -->
      <div v-if="activeCase" class="stage">
        <!-- case context header -->
        <Motion as="div" class="ctx ex-card ex-grain" :key="'ctx-' + activeId"
          :initial="reduced ? false : { opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }">
          <span class="ctx-medal" :class="`st-${(activeCase.status || 'draft').toLowerCase()}`">{{ initials(activeCase.employee_name || activeCase.employee_code) }}</span>
          <div class="ctx-id">
            <div class="ctx-top">
              <h3 class="ctx-name">{{ activeCase.employee_name || activeCase.employee_code || '—' }}</h3>
              <ExStatusPill :status="activeCase.status" />
            </div>
            <span class="ctx-meta ex-mono">{{ activeCase.case_number }} · {{ [activeCase.designation_name, activeCase.department_name].filter(Boolean).join(' · ') || '—' }}</span>
          </div>
          <div class="ctx-stats">
            <button v-if="activeCase.daysLeft != null" class="ctx-stat" :class="{ over: activeCase.daysLeft < 0 }" @click="$emit('go', { tab: 'notice' })" type="button">
              <CalendarClock :size="13" /><span><b class="ex-mono">{{ activeCase.daysLeft < 0 ? `+${-activeCase.daysLeft}` : activeCase.daysLeft }}</b>{{ activeCase.daysLeft < 0 ? 'd over' : 'd to LWD' }}</span>
            </button>
            <button class="ctx-stat" @click="$emit('go', { tab: 'asset-return' })" type="button"><PackageCheck :size="13" /><span>Assets</span></button>
            <button class="ctx-stat" @click="$emit('go', { tab: 'settlement' })" type="button"><Scale :size="13" /><span>F&amp;F</span></button>
          </div>
        </Motion>

        <!-- gatehouse instrument -->
        <ClearanceGatehouse :key="'gh-' + activeId" :clearance="activeClearance" :case-info="activeCase" :busy="completing"
          @complete="onComplete" @go="$emit('go', $event)" />

        <!-- department lane board -->
        <div v-if="groups.length" class="lanes" :key="'lanes-' + activeId">
          <ClearanceLaneCard v-for="(g, i) in groups" :key="g.department" :group="g" :index="i"
            @signoff="openSignoff" @reopen="openReopen" />
        </div>
        <div v-else-if="activeClearance" class="no-checklist ex-card">
          <ClipboardCheck :size="20" /> No clearance checklist has been seeded for this case yet.
        </div>
      </div>
    </template>

    <ClearanceSignoffModal :open="signoffOpen" :item="signoffItem" :users="users" :case-info="activeCase" :busy="busy"
      @close="signoffOpen = false" @submit="saveSignoff" @revoke="onRevoke" @go="$emit('go', $event)" />
    <ClearanceReopenModal :open="reopenOpen" :item="reopenItem" :busy="busy"
      @close="reopenOpen = false" @submit="saveReopen" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { ClipboardCheck, Users, X, Filter, CalendarClock, PackageCheck, Scale } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import ClearanceConsole from '../components/ClearanceConsole.vue'
import ClearanceCaseChip from '../components/ClearanceCaseChip.vue'
import ClearanceGatehouse from '../components/ClearanceGatehouse.vue'
import ClearanceLaneCard from '../components/ClearanceLaneCard.vue'
import ExStatusPill from '../components/ExStatusPill.vue'
import ExEmptyState from '../components/ExEmptyState.vue'
import ClearanceSignoffModal from '../modals/ClearanceSignoffModal.vue'
import ClearanceReopenModal from '../modals/ClearanceReopenModal.vue'
import ExPager from '../components/ExPager.vue'
import {
  fetchCases, fetchClearance, updateClearanceItem, reopenClearanceItem, completeClearance,
  revokeErpLogin, revokeProvisioning, applyHrRecords, applyFfAck, applyFinLoans,
  fetchEmployeesLite, daysRemaining, initials, errText, useClientPage,
} from '@/composables/useExit'
import { prefersReduced } from '@/composables/useShiftMotion'

const emit = defineEmits(['go', 'refresh-stats'])
const toast = useToast()
const reduced = prefersReduced()

const QUEUE_STATUSES = ['ACCEPTED', 'NOTICE_PERIOD', 'CLEARANCE']

const cases = ref([])
const roster = ref([])
const loadingCases = ref(false)
const loadingRoster = ref(false)
const activeId = ref(null)
const activeClearance = ref(null)
const activeLens = ref('')

const LENS_LABELS = { blocked: 'Blocked', awaiting: 'Not started', near: 'Near complete', ready: 'Ready to pass' }
const lensLabel = computed(() => LENS_LABELS[activeLens.value] || '')

const enrich = (c, clr) => {
  const groups = clr?.groups || []
  let blocked = 0, recoveries = 0, totalItems = 0
  for (const g of groups) {
    for (const it of (g.items || [])) {
      totalItems++
      if (it.status === 'BLOCKED') blocked++
      recoveries += Number(it.recovery_amount || 0)
    }
  }
  return {
    ...c, clr,
    progress: Math.round(clr?.progress_pct ?? c.clearance_progress_pct ?? 0),
    allMandatory: !!clr?.all_mandatory_cleared && totalItems > 0,
    blocked, recoveries, totalItems,
    daysLeft: daysRemaining(c.last_working_date),
  }
}

const loadAll = async () => {
  loadingCases.value = true
  try {
    const lists = await Promise.all(QUEUE_STATUSES.map(st => fetchCases({ status: st, limit: 100 }).catch(() => ({ items: [] }))))
    const seen = new Set()
    const merged = []
    for (const d of lists) for (const c of (d.items || [])) { if (!seen.has(c.id)) { seen.add(c.id); merged.push(c) } }
    cases.value = merged
    loadingRoster.value = true
    const results = await Promise.allSettled(merged.map(c => fetchClearance(c.id)))
    roster.value = merged.map((c, i) => enrich(c, results[i].status === 'fulfilled' ? results[i].value : null))
    // sort: blocked first, then least progress
    roster.value.sort((a, b) => (b.blocked - a.blocked) || (a.progress - b.progress))
    if (!activeId.value || !roster.value.some(r => r.id === activeId.value)) {
      const first = roster.value[0]
      if (first) { activeId.value = first.id; activeClearance.value = first.clr }
      else { activeId.value = null; activeClearance.value = null }
    } else {
      activeClearance.value = roster.value.find(r => r.id === activeId.value)?.clr || activeClearance.value
    }
  } catch (e) { toast.error(errText(e, 'Failed to load clearance queue')) }
  finally { loadingCases.value = false; loadingRoster.value = false }
}

const activeCase = computed(() => roster.value.find(r => r.id === activeId.value) || null)
const groups = computed(() => activeClearance.value?.groups || [])

const filteredRoster = computed(() => {
  const l = activeLens.value
  if (!l || l === 'all') return roster.value
  if (l === 'blocked') return roster.value.filter(r => r.blocked > 0)
  if (l === 'awaiting') return roster.value.filter(r => r.progress === 0)
  if (l === 'near') return roster.value.filter(r => r.progress >= 75 && !r.allMandatory)
  if (l === 'ready') return roster.value.filter(r => r.allMandatory)
  return roster.value
})

const { page: rosterPage, total: rosterTotal, totalPages: rosterPages, paged: pagedRoster } = useClientPage(filteredRoster, 10)
watch(activeLens, () => { rosterPage.value = 1 })

const pickLens = (key) => {
  activeLens.value = (key === 'all' || activeLens.value === key) ? '' : key
}
const selectCase = async (id) => {
  activeId.value = id
  const entry = roster.value.find(r => r.id === id)
  activeClearance.value = entry?.clr || null
  // refresh that case's clearance for the freshest stage view
  try {
    const clr = await fetchClearance(id)
    activeClearance.value = clr
    patchRoster(id, clr)
  } catch {}
}

const patchRoster = (id, clr) => {
  const idx = roster.value.findIndex(r => r.id === id)
  if (idx < 0) return
  const base = cases.value.find(c => c.id === id) || roster.value[idx]
  roster.value.splice(idx, 1, enrich(base, clr))
}
const refreshActive = async () => {
  if (!activeId.value) return
  const clr = await fetchClearance(activeId.value)
  activeClearance.value = clr
  patchRoster(activeId.value, clr)
}

// ── users (assignee dropdown) ──
const users = ref([])
const loadUsers = async () => {
  try {
    const data = await fetchEmployeesLite('')
    const seen = new Set()
    users.value = (data.items || []).reduce((acc, e) => {
      const uid = e.user_id
      const name = e.user?.full_name || e.full_name || e.name || e.employee_id || e.employee_code
      if (uid && !seen.has(uid)) { seen.add(uid); acc.push({ value: uid, label: name }) }
      return acc
    }, [])
  } catch { users.value = [] }
}

// ── signoff ──
const signoffOpen = ref(false)
const signoffItem = ref(null)
const reopenOpen = ref(false)
const reopenItem = ref(null)
const busy = ref(false)
const completing = ref(false)

const openSignoff = (it) => { signoffItem.value = it; signoffOpen.value = true }
const openReopen = (it) => { reopenItem.value = it; reopenOpen.value = true }

// Inform the user exactly what the apply endpoints changed in the real records.
const announceEffects = (effects = []) => {
  const major = effects.filter(e => e.severity === 'major')
  const fresh = effects.filter(e => e.severity === 'success')
  const already = effects.filter(e => e.severity === 'info')
  major.forEach(e => toast.success(`${e.label} — ${e.detail}`, { timeout: 6500 }))
  if (fresh.length) {
    toast.success(`${fresh.length} record${fresh.length > 1 ? 's' : ''} updated · ${fresh.map(e => e.label).join(' · ')}`)
  } else if (!major.length && already.length) {
    toast.info('Records were already up to date — gate signed off')
  }
}

const saveSignoff = async (payload) => {
  busy.value = true
  try {
    const it = signoffItem.value
    if (payload.applyKind === 'records' || payload.applyKind === 'ff' || payload.applyKind === 'fin') {
      // These gates WRITE to the real records (employee record / F&F settlement).
      const body = { ...payload.tasks, remarks: payload.remarks, assignee_user_id: payload.assignee_user_id }
      let effects
      if (payload.applyKind === 'records') ({ effects } = await applyHrRecords(it.id, body))
      else if (payload.applyKind === 'ff') ({ effects } = await applyFfAck(it.id, body))
      else ({ effects } = await applyFinLoans(it.id, { ...body, loan_recovery_amount: payload.loan_recovery_amount || 0 }))
      announceEffects(effects)
    } else {
      await updateClearanceItem(it.id, {
        status: payload.status, remarks: payload.remarks,
        recovery_amount: payload.recovery_amount, assignee_user_id: payload.assignee_user_id,
      })
    }
    signoffOpen.value = false
    await refreshActive()
    emit('refresh-stats')
  } catch (e) { toast.error(errText(e, 'Failed to save')) }
  finally { busy.value = false }
}
const onRevoke = async (item) => {
  busy.value = true
  try {
    if (item.item_key === 'it_erp_login') {
      await revokeErpLogin(item.id)
      toast.success('ERP login revoked — sign-in disabled')
    } else {
      await revokeProvisioning(item.id)
      toast.success('Access de-provisioned — gate signed off')
    }
    signoffOpen.value = false
    await refreshActive()
    emit('refresh-stats')
  } catch (e) { toast.error(errText(e, 'Could not revoke access')) }
  finally { busy.value = false }
}
const saveReopen = async (reason) => {
  busy.value = true
  try {
    await reopenClearanceItem(reopenItem.value.id, reason)
    reopenOpen.value = false
    toast.success('Clearance item reopened')
    await refreshActive()
    emit('refresh-stats')
  } catch (e) { toast.error(errText(e, 'Failed to reopen')) }
  finally { busy.value = false }
}
const onComplete = async () => {
  if (!activeId.value) return
  completing.value = true
  try {
    await completeClearance(activeId.value)
    toast.success('Clearance complete — record passed to settlement')
    emit('refresh-stats')
    emit('go', { tab: 'settlement' })
  } catch (e) { toast.error(errText(e, 'Could not complete clearance')) }
  finally { completing.value = false }
}

onMounted(() => { loadAll(); loadUsers() })
</script>

<style scoped>
.ex-clear { color: var(--ex-text); }

/* loading skeletons */
.clr-skel { display: flex; flex-direction: column; gap: 12px; }
.skel { position: relative; overflow: hidden; height: 120px; border-radius: 18px; background: var(--ex-surface); border: 1px solid var(--ex-border); }
.skel:first-child { height: 240px; }
.skel-shimmer { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(251,146,60,0.08) 50%, transparent 70%); animation: ex-sheen-pass 1.4s ease-in-out infinite; }

/* roster strip */
.roster { margin-bottom: 14px; }
.roster-cap { display: flex; align-items: center; gap: 10px; margin: 0 2px 9px; }
.rc-title { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ex-text-dim); }
.rc-count { font-size: 12px; font-weight: 800; color: var(--ex-text-muted); }
.rc-count i { font-style: normal; color: var(--ex-violet); }
.rc-clear { display: inline-flex; align-items: center; gap: 4px; margin-left: auto; padding: 4px 9px; border-radius: 8px; cursor: pointer; font-size: 11px; font-weight: 700; font-family: inherit;
  background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); color: var(--ex-violet); }
.roster-strip { display: flex; gap: 10px; overflow-x: auto; padding: 4px 2px 10px; scroll-snap-type: x proximity; }
.roster-strip > :deep(.ccc) { scroll-snap-align: start; }
.roster-strip::-webkit-scrollbar { height: 7px; }
.roster-strip::-webkit-scrollbar-thumb { background: var(--ex-border-strong); border-radius: 999px; }
.roster-strip::-webkit-scrollbar-track { background: transparent; }
.roster-strip.empty { overflow: visible; }
.roster-empty { display: inline-flex; align-items: center; gap: 7px; padding: 14px 16px; border-radius: 13px; font-size: 12.5px; font-weight: 600; color: var(--ex-text-muted);
  background: var(--ex-surface); border: 1px dashed var(--ex-border-strong); }
.roster-empty svg { color: var(--ex-text-dim); }
.roster-empty button { background: none; border: none; cursor: pointer; font-family: inherit; font-size: 12.5px; font-weight: 750; color: var(--ex-violet); text-decoration: underline; }

/* stage */
.stage { display: flex; flex-direction: column; gap: 14px; }

/* context header */
.ctx { display: flex; align-items: center; gap: 14px; padding: 14px 16px; position: relative; overflow: hidden; }
.ctx-medal { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 13px; flex-shrink: 0; font-family: var(--ex-mono); font-size: 14px; font-weight: 850;
  color: var(--ex-violet); background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.ctx-id { flex: 1; min-width: 0; }
.ctx-top { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.ctx-name { font-size: 16px; font-weight: 820; margin: 0; color: var(--ex-text); }
.ctx-meta { font-size: 11.5px; color: var(--ex-text-muted); margin-top: 2px; display: block; }
.ctx-stats { display: flex; gap: 7px; flex-wrap: wrap; }
.ctx-stat { display: inline-flex; align-items: center; gap: 6px; padding: 8px 11px; border-radius: 11px; cursor: pointer; font-size: 11.5px; font-weight: 700; font-family: inherit;
  background: var(--ex-surface); border: 1px solid var(--ex-border); color: var(--ex-text-secondary); transition: transform 0.2s, border-color 0.2s; }
.ctx-stat:hover { transform: translateY(-1px); border-color: var(--ex-violet-border); color: var(--ex-text); }
.ctx-stat.over { border-color: color-mix(in srgb, var(--ex-blocked) 34%, transparent); color: var(--ex-blocked); }
.ctx-stat b { font-size: 13px; font-weight: 850; }

/* lane board */
.lanes { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
.no-checklist { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 30px; color: var(--ex-text-muted); font-size: 13px; }
.no-checklist svg { color: var(--ex-text-dim); }

@media (max-width: 640px) {
  .ctx { flex-wrap: wrap; }
  .ctx-stats { width: 100%; }
  .lanes { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) { .skel-shimmer { animation: none; } }
</style>
