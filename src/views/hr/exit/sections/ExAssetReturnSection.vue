<template>
  <div class="ex-assets">
    <template v-if="!loadingCases && !cases.length">
      <ExEmptyState :icon="PackageCheck" title="No active separations"
        subtitle="Once a separation starts, the employee's held company assets surface here as return tasks." />
    </template>

    <template v-else>
      <AssetRecoveryConsole :roster="roster" :active-lens="activeLens" :loading="loadingCases || loadingRoster"
        @pick="pickLens" @refresh="loadAll" @go="$emit('go', $event)" @fleet="goFleet" />

      <div v-if="loadingCases && !roster.length" class="bay-skel">
        <div v-for="n in 3" :key="n" class="skel"><span class="skel-shimmer" /></div>
      </div>

      <ExEmptyState v-else-if="!roster.length" :icon="PackageCheck" title="No company assets to recover"
        subtitle="Every active separation is asset-free or fully returned. Nothing is outstanding across the fleet.">
        <template #action>
          <button class="empty-act" type="button" @click="goFleet"><ArrowUpRight :size="14" /> Open Fleet Returns</button>
        </template>
      </ExEmptyState>

      <template v-else>
        <!-- roster strip -->
        <div class="roster">
          <div class="roster-cap">
            <span class="rc-title"><Users :size="13" /> Recovery queue</span>
            <span class="rc-count ex-mono">{{ filteredRoster.length }}<i v-if="activeLens && activeLens !== 'all'"> · {{ lensLabel }}</i></span>
            <button v-if="activeLens && activeLens !== 'all'" class="rc-clear" type="button" @click="pickLens('all')"><X :size="12" /> Clear</button>
          </div>
          <div class="roster-strip" :class="{ empty: !filteredRoster.length }">
            <AssetCaseChip v-for="(c, i) in pagedRoster" :key="c.id" :c="c" :index="i" :active="c.id === activeId" @select="selectCase" />
            <div v-if="!filteredRoster.length" class="roster-empty">
              <Filter :size="15" /> No cases match this lens · <button type="button" @click="pickLens('all')">show all</button>
            </div>
          </div>
          <ExPager :page="rosterPage" :total-pages="rosterPages" :total="rosterTotal" :limit="10" @update:page="rosterPage = $event" />
        </div>

        <!-- stage -->
        <div v-if="activeCase" class="stage">
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
              <button class="ctx-stat" @click="$emit('go', { tab: 'clearance' })" type="button"><ClipboardCheck :size="13" /><span>Clearance</span></button>
              <button class="ctx-stat" @click="$emit('go', { tab: 'settlement' })" type="button"><Scale :size="13" /><span>F&amp;F</span></button>
            </div>
          </Motion>

          <AssetRecoveryBay :key="'bay-' + activeId" :assets="activeAssets" :metrics="activeMetrics" :case-info="activeCase" :busy="busy"
            @reflag="reflag" @go="$emit('go', $event)" @go-fleet="goFleet" />

          <div v-if="activeAssets.length" class="manifest" :key="'man-' + activeId">
            <AssetReturnCard v-for="(a, i) in sortedAssets" :key="a.key" :a="a" :index="i" @fleet="goFleet" />
          </div>
          <div v-else class="no-assets ex-card"><PackageCheck :size="20" /> No company assets are allocated to this employee.</div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Motion } from 'motion-v'
import {
  PackageCheck, Users, X, Filter, CalendarClock, ClipboardCheck, Scale, ArrowUpRight,
  Laptop, Monitor, Smartphone, Nfc, CreditCard, IdCard, Headphones, Keyboard, Mouse, Car, Key, Package,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import AssetRecoveryConsole from '../components/AssetRecoveryConsole.vue'
import AssetCaseChip from '../components/AssetCaseChip.vue'
import AssetRecoveryBay from '../components/AssetRecoveryBay.vue'
import AssetReturnCard from '../components/AssetReturnCard.vue'
import ExStatusPill from '../components/ExStatusPill.vue'
import ExEmptyState from '../components/ExEmptyState.vue'
import ExPager from '../components/ExPager.vue'
import { fetchCases, fetchExitAssets, flagAssetReturns, daysRemaining, initials, errText, useClientPage } from '@/composables/useExit'
import { prefersReduced } from '@/composables/useShiftMotion'

const emit = defineEmits(['go', 'refresh-stats'])
const toast = useToast()
const router = useRouter()
const reduced = prefersReduced()

const QUEUE_STATUSES = ['ACCEPTED', 'NOTICE_PERIOD', 'CLEARANCE', 'SETTLEMENT']

const ASSET_ICON = {
  LAPTOP: Laptop, DESKTOP: Monitor, MOBILE: Smartphone, SIM: Nfc, RFID_CARD: CreditCard, ID_CARD: IdCard,
  HEADSET: Headphones, MONITOR: Monitor, KEYBOARD: Keyboard, MOUSE: Mouse, VEHICLE: Car, KEYS: Key, OTHER: Package,
}
const prettyType = (t) => t ? t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Asset'

// Recovery phase from the allocation lifecycle (source of truth), overlaying the
// return-transfer status for assets still in the pipeline.
//   0 held · 1 requested · 2 in-transit · 3 recovered · 4 lost/damaged (→ F&F)
const phaseFromItem = (it) => {
  const al = it.allocation_status
  const tr = it.transfer_status
  if (al === 'RETURNED') return { phase: 3, statusKey: 'recovered', statusLabel: 'Recovered' }
  if (al === 'LOST') return { phase: 4, statusKey: 'lost', statusLabel: 'Lost' }
  if (al === 'DAMAGED') return { phase: 4, statusKey: 'damaged', statusLabel: 'Damaged' }
  // still held (ALLOCATED / unknown) → pipeline state from the transfer
  if (tr === 'COMPLETED') return { phase: 3, statusKey: 'recovered', statusLabel: 'Recovered' }
  if (tr === 'APPROVED') return { phase: 2, statusKey: 'transit', statusLabel: 'In transit' }
  if (tr === 'REQUESTED' || it.return_requested) return { phase: 1, statusKey: 'requested', statusLabel: 'Return requested' }
  return { phase: 0, statusKey: 'held', statusLabel: 'Held' }
}
const buildAssets = (data) => {
  if (!data) return []
  // NEW unified shape (allocation lifecycle = source of truth)
  if (Array.isArray(data.items)) {
    return data.items.map(it => ({
      key: 'x' + it.asset_id, asset_id: it.asset_id, name: it.asset_name, tag: it.asset_tag,
      type: it.asset_type, typeLabel: prettyType(it.asset_type), icon: ASSET_ICON[it.asset_type] || Package,
      transferId: it.transfer_id || null, returnedDate: it.returned_date || null, condition: it.condition_on_return || null,
      ...phaseFromItem(it),
    }))
  }
  // legacy fallback (pre-fix backend): allocations = held, transfers = status
  const transferByAsset = {}
  for (const t of (data.transfers || [])) transferByAsset[t.asset_id] = t
  const seen = new Set()
  const out = []
  const make = (id, name, tag, type, t) => ({
    key: 'x' + id, asset_id: id, name, tag, type, typeLabel: prettyType(type), icon: ASSET_ICON[type] || Package,
    transferId: t?.transfer_id || null, returnedDate: null, condition: null,
    ...phaseFromItem({ allocation_status: t ? null : 'ALLOCATED', transfer_status: t?.status }),
  })
  for (const al of (data.allocations || [])) { seen.add(al.asset_id); out.push(make(al.asset_id, al.asset_name, al.asset_tag, al.asset_type, transferByAsset[al.asset_id])) }
  for (const t of (data.transfers || [])) { if (!seen.has(t.asset_id)) out.push(make(t.asset_id, t.asset_name, t.asset_tag, null, t)) }
  return out
}
const computeMetrics = (assets, caseObj) => {
  const total = assets.length
  const recovered = assets.filter(a => a.phase === 3).length
  const shortfall = assets.filter(a => a.phase === 4).length
  const transit = assets.filter(a => a.phase === 2).length
  const requested = assets.filter(a => a.phase === 1).length
  const held = assets.filter(a => a.phase === 0).length
  const unreturned = held + requested + transit          // still physically out / in the pipeline
  const daysLeft = daysRemaining(caseObj?.last_working_date)
  return {
    total, recovered, shortfall, transit, requested, held, unreturned,
    recoveryPct: total ? Math.round(recovered * 100 / total) : 100,
    daysLeft,
    atRisk: (unreturned > 0 && daysLeft != null && daysLeft >= 0 && daysLeft <= 7) || shortfall > 0,
    overdue: unreturned > 0 && daysLeft != null && daysLeft < 0,
  }
}

const cases = ref([])
const roster = ref([])
const loadingCases = ref(false)
const loadingRoster = ref(false)
const activeId = ref(null)
const activeData = ref(null)
const activeLens = ref('')
const busy = ref(false)

const LENS_LABELS = { recovered: 'Fully recovered', transit: 'In transit', atrisk: 'At risk', units: 'Units still out' }
const lensLabel = computed(() => LENS_LABELS[activeLens.value] || '')

const enrich = (c, data) => {
  const assets = buildAssets(data)
  return { ...c, data, assets, ...computeMetrics(assets, c) }
}

const loadAll = async () => {
  loadingCases.value = true
  try {
    const lists = await Promise.all(QUEUE_STATUSES.map(st => fetchCases({ status: st, limit: 100 }).catch(() => ({ items: [] }))))
    const seen = new Set(); const merged = []
    for (const d of lists) for (const c of (d.items || [])) { if (!seen.has(c.id)) { seen.add(c.id); merged.push(c) } }
    cases.value = merged
    loadingRoster.value = true
    const results = await Promise.allSettled(merged.map(c => fetchExitAssets(c.id)))
    roster.value = merged
      .map((c, i) => enrich(c, results[i].status === 'fulfilled' ? results[i].value : null))
      .filter(r => r.total > 0)
      .sort((a, b) => (Number(b.overdue) - Number(a.overdue)) || (Number(b.atRisk) - Number(a.atRisk)) || (b.unreturned - a.unreturned))
    if (!activeId.value || !roster.value.some(r => r.id === activeId.value)) {
      const first = roster.value[0]
      activeId.value = first?.id || null
      activeData.value = first?.data || null
    } else {
      activeData.value = roster.value.find(r => r.id === activeId.value)?.data || activeData.value
    }
  } catch (e) { toast.error(errText(e, 'Failed to load recovery queue')) }
  finally { loadingCases.value = false; loadingRoster.value = false }
}

const activeCase = computed(() => roster.value.find(r => r.id === activeId.value) || null)
const activeAssets = computed(() => buildAssets(activeData.value))
const activeMetrics = computed(() => computeMetrics(activeAssets.value, activeCase.value))
// pipeline (held→transit) first, then lost/damaged (attention), then recovered (done)
const phaseRank = (p) => (p === 3 ? 4 : p === 4 ? 3 : p)
const sortedAssets = computed(() => [...activeAssets.value].sort((a, b) => phaseRank(a.phase) - phaseRank(b.phase)))

const filteredRoster = computed(() => {
  const l = activeLens.value
  if (!l || l === 'all') return roster.value
  if (l === 'recovered') return roster.value.filter(r => r.total > 0 && r.recovered === r.total)
  if (l === 'transit') return roster.value.filter(r => r.transit > 0)
  if (l === 'atrisk') return roster.value.filter(r => r.atRisk || r.overdue)
  if (l === 'units') return roster.value.filter(r => r.unreturned > 0)
  return roster.value
})

const { page: rosterPage, total: rosterTotal, totalPages: rosterPages, paged: pagedRoster } = useClientPage(filteredRoster, 10)
watch(activeLens, () => { rosterPage.value = 1 })

const pickLens = (key) => { activeLens.value = (key === 'all' || activeLens.value === key) ? '' : key }

const patchRoster = (id, data) => {
  const idx = roster.value.findIndex(r => r.id === id)
  if (idx < 0) return
  const base = cases.value.find(c => c.id === id) || roster.value[idx]
  roster.value.splice(idx, 1, enrich(base, data))
}
const selectCase = async (id) => {
  activeId.value = id
  activeData.value = roster.value.find(r => r.id === id)?.data || null
  try { const data = await fetchExitAssets(id); activeData.value = data; patchRoster(id, data) } catch {}
}
const reflag = async () => {
  if (!activeId.value) return
  busy.value = true
  try {
    const r = await flagAssetReturns(activeId.value)
    toast.success(r.created > 0 ? `${r.created} return task${r.created > 1 ? 's' : ''} created` : 'No new return tasks needed')
    const data = await fetchExitAssets(activeId.value)
    activeData.value = data; patchRoster(activeId.value, data)
    emit('refresh-stats')
  } catch (e) { toast.error(errText(e, 'Failed to flag returns')) }
  finally { busy.value = false }
}
const goFleet = () => router.push('/admin/hr/assets/returns')

onMounted(loadAll)
</script>

<style scoped>
.ex-assets { color: var(--ex-text); }

.bay-skel { display: flex; flex-direction: column; gap: 12px; }
.skel { position: relative; overflow: hidden; height: 120px; border-radius: 18px; background: var(--ex-surface); border: 1px solid var(--ex-border); }
.skel:first-child { height: 240px; }
.skel-shimmer { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(251,146,60,0.08) 50%, transparent 70%); animation: ex-sheen-pass 1.4s ease-in-out infinite; }
.empty-act { display: inline-flex; align-items: center; gap: 6px; margin-top: 6px; padding: 9px 15px; border-radius: 11px; font-size: 13px; font-weight: 750; cursor: pointer;
  background: var(--ex-surface); border: 1px solid var(--ex-border-strong); color: var(--ex-text); font-family: inherit; }

/* roster */
.roster { margin-bottom: 14px; }
.roster-cap { display: flex; align-items: center; gap: 10px; margin: 0 2px 9px; }
.rc-title { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ex-text-dim); }
.rc-count { font-size: 12px; font-weight: 800; color: var(--ex-text-muted); }
.rc-count i { font-style: normal; color: var(--ex-violet); }
.rc-clear { display: inline-flex; align-items: center; gap: 4px; margin-left: auto; padding: 4px 9px; border-radius: 8px; cursor: pointer; font-size: 11px; font-weight: 700; font-family: inherit;
  background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); color: var(--ex-violet); }
.roster-strip { display: flex; gap: 10px; overflow-x: auto; padding: 4px 2px 10px; scroll-snap-type: x proximity; }
.roster-strip > :deep(.acc) { scroll-snap-align: start; }
.roster-strip::-webkit-scrollbar { height: 7px; }
.roster-strip::-webkit-scrollbar-thumb { background: var(--ex-border-strong); border-radius: 999px; }
.roster-strip.empty { overflow: visible; }
.roster-empty { display: inline-flex; align-items: center; gap: 7px; padding: 14px 16px; border-radius: 13px; font-size: 12.5px; font-weight: 600; color: var(--ex-text-muted);
  background: var(--ex-surface); border: 1px dashed var(--ex-border-strong); }
.roster-empty svg { color: var(--ex-text-dim); }
.roster-empty button { background: none; border: none; cursor: pointer; font-family: inherit; font-size: 12.5px; font-weight: 750; color: var(--ex-violet); text-decoration: underline; }

/* stage */
.stage { display: flex; flex-direction: column; gap: 14px; }
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

.manifest { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
.no-assets { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 30px; color: var(--ex-text-muted); font-size: 13px; }
.no-assets svg { color: var(--ex-text-dim); }

@media (max-width: 640px) { .ctx { flex-wrap: wrap; } .ctx-stats { width: 100%; } .manifest { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .skel-shimmer { animation: none; } }
</style>
