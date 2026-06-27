<template>
  <!-- ═══════════════════════════ GOALS & OKRs · The Ascent ═══════════════════════════
       Objectives with measurable key results, tracked toward a north-star summit. The
       signature GoalAscent instrument plots every objective as a climber on the slope by
       its progress altitude; the roster drives the OKR loop — define → check in → roll up.
       HR creates objectives via the OBJECTIVE COMPOSER wizard (owner + rationale + KRs +
       the assets-register calendar). Cross-links the upstream rubric (Appraisal Templates),
       Reviews (goals score the Goals section), Insights (goal-health) and Merit. -->
  <div class="pg-sec">
    <PerfHero eyebrow="Develop · Goals &amp; OKRs" title="Goals &amp;" accent="OKRs" :icon="Target"
      sub="Set objectives with measurable key results, check in to roll up progress, and align everyone toward the north-star summit — the corporate OKR engine.">
      <template #actions>
        <button class="perf-btn" type="button" :disabled="loading" @click="reload"><RefreshCw :size="14" :class="{ 'perf-spin': loading }" /></button>
        <button class="perf-btn perf-btn-primary" type="button" @click="openCreate"><Plus :size="15" /> New objective</button>
      </template>
      <template #lenses>
        <div class="pg-lenses">
          <button v-for="l in lenses" :key="l.key" class="pg-lens" type="button" :style="{ '--acc': l.color }"
            :class="{ on: l.status !== undefined && fStatus === l.status, stat: l.status === undefined }"
            @click="l.status !== undefined ? setStatus(l.status) : null">
            <span class="pg-lens-ic"><component :is="l.icon" :size="15" /></span>
            <span class="pg-lens-val"><SetCountUp :value="l.value" :decimals="0" :suffix="l.suffix || ''" /></span>
            <span class="pg-lens-lab">{{ l.label }}</span>
            <span class="pg-lens-bar" />
          </button>
        </div>
      </template>
    </PerfHero>

    <!-- signature instrument -->
    <GoalAscent :objectives="objectives" :stats="stats" :active-id="activeId" @focus="focusObjective" />

    <!-- toolbar -->
    <div class="pg-toolbar">
      <div class="pg-chips">
        <button class="pg-chip" :class="{ on: !fStatus }" @click="setStatus(null)">All</button>
        <button v-for="s in STATUS_KEYS" :key="s" class="pg-chip" :class="{ on: fStatus === s }"
          :style="{ '--c': goalStatusMeta(s).color }" @click="setStatus(s)">
          <component :is="goalStatusMeta(s).icon" :size="12" />{{ goalStatusMeta(s).label }}
        </button>
      </div>
      <div class="pg-cyc-wrap"><PerfSelect v-model="fCycle" :options="cycleOptions" placeholder="All cycles" @update:modelValue="reload" /></div>
    </div>

    <div v-if="loading" class="pg-loading"><Loader2 :size="20" class="perf-spin" /> Loading goals…</div>
    <div v-else-if="!objectives.length" class="pg-empty">
      <span class="pg-empty-ic"><Target :size="26" /></span>
      <b>{{ fStatus || fCycle ? 'No objectives match' : 'No objectives yet' }}</b>
      <p>{{ fStatus || fCycle ? 'Try clearing the filters.' : 'Create an objective with measurable key results to start the climb toward your outcomes.' }}</p>
      <button v-if="fStatus || fCycle" class="perf-btn perf-btn-steel" type="button" @click="clearFilters">Clear filters</button>
      <button v-else class="perf-btn perf-btn-primary" type="button" @click="openCreate"><Plus :size="14" /> New objective</button>
    </div>
    <div v-else class="pg-grid">
      <GoalObjectiveCard v-for="(o, i) in objectives" :key="o.id" :objective="o" :index="i" :active="o.id === activeId"
        @check-in="openCheckIn" @add-kr="openAddKr" @delete="confirmDelete" @edit-status="cycleStatus" />
    </div>

    <!-- connectivity bus -->
    <div class="pg-bus">
      <span class="pg-bus-h"><GitMerge :size="13" /> From objective to outcome</span>
      <div class="pg-bus-row">
        <button class="pg-wire settings" type="button" @click="goSettings('appraisal-templates')"><FileText :size="13" /><b>Appraisal Rubric</b><i>has a Goals section type</i></button>
        <ArrowRight :size="14" class="pg-wire-arr" />
        <button class="pg-wire here" type="button"><Target :size="13" /><b>Goals · here</b><i>define &amp; check in</i></button>
        <ArrowRight :size="14" class="pg-wire-arr" />
        <button class="pg-wire" type="button" @click="$emit('go', 'reviews')"><ClipboardList :size="13" /><b>Reviews</b><i>score the Goals section</i></button>
        <ArrowRight :size="14" class="pg-wire-arr" />
        <button class="pg-wire" type="button" @click="$emit('go', 'insights')"><Activity :size="13" /><b>Insights</b><i>goal-health gauge</i></button>
        <ArrowRight :size="14" class="pg-wire-arr" />
        <button class="pg-wire" type="button" @click="$emit('go', 'merit')"><Coins :size="13" /><b>Merit</b><i>score → increment</i></button>
      </div>
    </div>

    <PerfObjectiveModal :open="createOpen" :saving="saving" :add-kr-to="addKrTarget"
      @close="closeCreate" @save="onSaveObjective" @save-kr="onSaveKr" />
    <GoalCheckInModal :open="checkInOpen" :goal="checkInGoal" :saving="saving"
      @close="checkInOpen = false" @save="onCheckIn" />
    <GoalDeleteModal :open="deleteOpen" :goal="deleteTarget" :busy="deleting" :cancel-busy="cancelling"
      @close="deleteOpen = false" @confirm="onDelete" @cancel-instead="onCancelGoal" />
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Target, Plus, Orbit, Loader2, RefreshCw, TrendingUp, AlertTriangle, Trophy, ListChecks, GitMerge, ArrowRight, FileText, ClipboardList, Activity, Coins } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import PerfHero from '../components/PerfHero.vue'
import PerfSelect from '../components/PerfSelect.vue'
import GoalAscent from '../components/GoalAscent.vue'
import GoalObjectiveCard from '../components/GoalObjectiveCard.vue'
import PerfObjectiveModal from '../components/PerfObjectiveModal.vue'
import GoalCheckInModal from '../components/GoalCheckInModal.vue'
import GoalDeleteModal from '../components/GoalDeleteModal.vue'
import SetCountUp from '@/views/hr/settings/components/SetCountUp.vue'
import {
  fetchGoalStats, fetchGoals, createObjective, createGoal, goalCheckIn, updateGoal, deleteGoal,
  goalStatusMeta, GOAL_STATUS_META,
} from '@/composables/usePerformance'
import { CYCLES, cycleMeta } from '@/views/hr/settings/composables/appraisalVocab'

const emit = defineEmits(['go'])
const toast = useToast()
const router = useRouter()
const STATUS_KEYS = Object.keys(GOAL_STATUS_META)
const NEXT_STATUS = { DRAFT: 'ON_TRACK', ON_TRACK: 'AT_RISK', AT_RISK: 'OFF_TRACK', OFF_TRACK: 'ACHIEVED', ACHIEVED: 'ON_TRACK', MISSED: 'ON_TRACK', CANCELLED: 'DRAFT' }

const stats = ref({})
const objectives = ref([])
const loading = ref(false)
const fStatus = ref(null)
const fCycle = ref(null)
const saving = ref(false)
const activeId = ref(null)

const cycleOptions = computed(() => [{ value: null, label: 'All cycles' }, ...CYCLES.map(c => ({ value: c, label: cycleMeta(c).label }))])
const byStatus = (k) => (stats.value.by_status || {})[k] || 0
const lenses = computed(() => [
  { key: 'obj', label: 'Objectives', value: stats.value.objectives || 0, color: 'var(--perf-gold)', icon: Target },
  { key: 'kr', label: 'Key results', value: stats.value.key_results || 0, color: 'var(--perf-amber)', icon: ListChecks },
  { key: 'ontrack', label: 'On track', value: byStatus('ON_TRACK'), color: 'var(--perf-ok)', icon: TrendingUp, status: 'ON_TRACK' },
  { key: 'risk', label: 'At risk', value: byStatus('AT_RISK'), color: 'var(--perf-conflict)', icon: AlertTriangle, status: 'AT_RISK' },
  { key: 'done', label: 'Achieved', value: stats.value.achieved || 0, color: 'var(--perf-ok)', icon: Trophy, status: 'ACHIEVED' },
  { key: 'avg', label: 'Avg progress', value: stats.value.avg_progress || 0, color: 'var(--perf-ember)', icon: Orbit, suffix: '%' },
])

async function loadStats() {
  try { stats.value = await fetchGoalStats(fCycle.value ? { cycle: fCycle.value } : {}) } catch { stats.value = {} }
}
async function reload() {
  loading.value = true
  try {
    const params = { top_level: true, limit: 200 }
    if (fStatus.value) params.status = fStatus.value
    if (fCycle.value) params.cycle = fCycle.value
    const data = await fetchGoals(params)
    objectives.value = data.items || []
    await loadStats()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load goals') }
  finally { loading.value = false }
}
const setStatus = (s) => { fStatus.value = fStatus.value === s ? null : s; reload() }
const clearFilters = () => { fStatus.value = null; fCycle.value = null; reload() }

function focusObjective(id) {
  activeId.value = activeId.value === id ? null : id
  if (activeId.value) nextTick(() => { document.querySelector('.goc.active')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) })
}

// create objective
const createOpen = ref(false)
const addKrTarget = ref(null)
const openCreate = () => { addKrTarget.value = null; createOpen.value = true }
const closeCreate = () => { createOpen.value = false; addKrTarget.value = null }
const openAddKr = (objective) => { addKrTarget.value = objective; createOpen.value = true }

async function onSaveObjective(payload) {
  saving.value = true
  try { await createObjective(payload); toast.success('Objective created'); closeCreate(); await reload() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Failed to create objective') }
  finally { saving.value = false }
}
async function onSaveKr(payload) {
  saving.value = true
  try { await createGoal(payload); toast.success('Key result added'); closeCreate(); await reload() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Failed to add key result') }
  finally { saving.value = false }
}

// check-in
const checkInOpen = ref(false)
const checkInGoal = ref(null)
const openCheckIn = (goal) => { checkInGoal.value = goal; checkInOpen.value = true }
async function onCheckIn(payload) {
  saving.value = true
  try { await goalCheckIn(checkInGoal.value.id, payload); toast.success('Progress logged'); checkInOpen.value = false; await reload() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Check-in failed') }
  finally { saving.value = false }
}

// quick status cycle on an objective
async function cycleStatus(goal) {
  try { await updateGoal(goal.id, { status: NEXT_STATUS[goal.status] || 'ON_TRACK' }); await reload() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Failed to update') }
}

// delete / retire
const deleteOpen = ref(false)
const deleteTarget = ref(null)
const deleting = ref(false)
const cancelling = ref(false)
const confirmDelete = (goal) => { deleteTarget.value = goal; deleteOpen.value = true }
async function onDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try { await deleteGoal(deleteTarget.value.id); toast.success('Objective deleted — kept in the audit trail'); deleteOpen.value = false; await reload() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Delete failed') }
  finally { deleting.value = false }
}
// reversible alternative — mark cancelled (keeps the record + check-ins, can be reopened)
async function onCancelGoal() {
  if (!deleteTarget.value) return
  cancelling.value = true
  try { await updateGoal(deleteTarget.value.id, { status: 'CANCELLED' }); toast.success('Objective cancelled — kept for the record'); deleteOpen.value = false; await reload() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Could not cancel') }
  finally { cancelling.value = false }
}

function goSettings(t) { router.push(`/admin/hr/settings/${t}`) }
onMounted(reload)
</script>

<style scoped>
.pg-sec { display: flex; flex-direction: column; gap: 16px; }
.pg-lenses { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; }
.pg-lens { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 3px; cursor: pointer; text-align: left; padding: 12px 13px 14px; border-radius: 14px;
  background: var(--perf-surface); border: 1px solid var(--perf-border); transition: transform 0.25s var(--perf-spring), border-color 0.25s, background 0.22s; --acc: var(--perf-gold); }
.pg-lens:not(.stat):hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--acc) 42%, transparent); }
.pg-lens.stat { cursor: default; }
.pg-lens.on { border-color: color-mix(in srgb, var(--acc) 55%, transparent); background: color-mix(in srgb, var(--acc) 9%, var(--perf-surface)); }
.pg-lens-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; color: var(--acc); background: color-mix(in srgb, var(--acc) 13%, transparent); border: 1px solid color-mix(in srgb, var(--acc) 26%, transparent); }
.pg-lens.stat .pg-lens-ic { color: var(--perf-text-muted); background: var(--perf-track); border-color: var(--perf-border); }
.pg-lens-val { margin-top: 7px; font-size: 21px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; line-height: 1; }
.pg-lens-lab { font-size: 10.5px; font-weight: 650; color: var(--perf-text-muted); }
.pg-lens.on .pg-lens-lab { color: var(--acc); }
.pg-lens-bar { position: absolute; left: 0; bottom: 0; height: 2px; width: 100%; transform: scaleX(0); transform-origin: left; background: var(--acc); transition: transform 0.3s var(--perf-spring); }
.pg-lens:not(.stat):hover .pg-lens-bar, .pg-lens.on .pg-lens-bar { transform: scaleX(1); }

.pg-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.pg-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.pg-chip { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 650;
  color: var(--perf-text-muted); background: var(--perf-surface); border: 1px solid var(--perf-border); transition: all 0.2s var(--perf-spring); --c: var(--perf-gold); }
.pg-chip :deep(svg) { color: var(--c); }
.pg-chip:hover { color: var(--perf-text); border-color: var(--perf-border-strong); }
.pg-chip.on { color: var(--c); background: color-mix(in srgb, var(--c) 13%, transparent); border-color: color-mix(in srgb, var(--c) 36%, transparent); }
.pg-cyc-wrap { width: 200px; }

.pg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 14px; }
.pg-loading { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 40px; color: var(--perf-text-muted); font-size: 13px; }
.pg-empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 9px; padding: 44px 24px; border-radius: 18px; background: var(--perf-surface); border: 1px dashed var(--perf-border-strong); }
.pg-empty-ic { display: grid; place-items: center; width: 60px; height: 60px; border-radius: 18px; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 12%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 26%, transparent); }
.pg-empty b { font-size: 15px; font-weight: 800; color: var(--perf-text); margin-top: 4px; }
.pg-empty p { margin: 0 0 4px; font-size: 12.5px; color: var(--perf-text-muted); max-width: 46ch; line-height: 1.5; }

/* connectivity bus */
.pg-bus { display: flex; flex-direction: column; gap: 11px; padding: 15px 17px; border-radius: 16px; background: var(--perf-surface); border: 1px solid var(--perf-border); }
.pg-bus-h { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--perf-text-secondary); }
.pg-bus-h :deep(svg) { color: var(--perf-gold); }
.pg-bus-row { display: flex; align-items: stretch; gap: 6px; flex-wrap: wrap; }
.pg-wire { flex: 1; min-width: 130px; display: flex; flex-direction: column; gap: 1px; padding: 9px 12px; border-radius: 12px; cursor: pointer; font: inherit; text-align: left;
  background: var(--perf-surface-elevated); border: 1px solid var(--perf-border); transition: all 0.18s var(--perf-spring); }
.pg-wire:hover { transform: translateY(-2px); border-color: var(--perf-border-warm); }
.pg-wire :deep(svg) { color: var(--perf-gold); }
.pg-wire b { font-size: 12px; font-weight: 750; color: var(--perf-text); margin-top: 3px; }
.pg-wire i { font-size: 9.5px; font-style: normal; color: var(--perf-text-dim); }
.pg-wire.settings { background: color-mix(in srgb, var(--perf-gold) 7%, var(--perf-surface-elevated)); border-style: dashed; border-color: var(--perf-border-warm); }
.pg-wire.here { background: color-mix(in srgb, var(--perf-gold) 13%, var(--perf-surface-elevated)); border-color: color-mix(in srgb, var(--perf-gold) 40%, transparent); cursor: default; }
.pg-wire.here:hover { transform: none; }
.pg-wire-arr { align-self: center; color: var(--perf-text-dim); flex-shrink: 0; }

@media (max-width: 1080px) { .pg-lenses { grid-template-columns: repeat(3, 1fr); } .pg-wire-arr { display: none; } }
@media (max-width: 620px) { .pg-lenses { grid-template-columns: repeat(2, 1fr); } .pg-grid { grid-template-columns: 1fr; } .pg-cyc-wrap { width: 100%; } }
@media (prefers-reduced-motion: reduce) { .pg-lens:hover, .pg-wire:hover { transform: none; } }
</style>
