<template>
  <div class="dz">
    <SetSectionHead eyebrow="Organization · Titles" title="The" accent="Ascension"
      accent-color="var(--set-orange)" :icon="BadgeCheck"
      sub="Every job title in the org, ranked into a reporting hierarchy and mapped to a pay grade. Titles flow straight into Employee records and Recruitment requisitions — wire the ladder here and the whole org reads it live.">
      <template #actions>
        <button class="set-btn set-btn-steel" :disabled="loading" @click="reload" title="Refresh">
          <RefreshCw :size="14" :class="{ 'set-spin': loading }" />
        </button>
        <Motion as="button" type="button" class="set-btn set-btn-primary"
          :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="openCreate">
          <Plus :size="14" /> New title
        </Motion>
      </template>

      <template #lenses>
        <div class="dz-lenses">
          <button class="set-chip" :class="{ on: lens === 'all' }" style="--acc: var(--set-orange)" @click="lens = 'all'">
            <Layers :size="12" /> All <b>{{ rows.length }}</b>
          </button>
          <button class="set-chip" :class="{ on: lens === 'top' }" style="--acc: var(--set-gold)" @click="setLens('top')">
            <Crown :size="12" /> Top of chain <b>{{ topCount }}</b>
          </button>
          <button class="set-chip" :class="{ on: lens === 'linked' }" style="--acc: var(--set-amber)" @click="setLens('linked')">
            <GitFork :size="12" /> Has reporting line <b>{{ linkedCount }}</b>
          </button>
          <button class="set-chip" :class="{ on: lens === 'vacant' }" style="--acc: var(--set-conflict)" @click="setLens('vacant')">
            <UserMinus :size="12" /> Vacant <b>{{ vacantCount }}</b>
          </button>
          <span class="set-chip dz-lens-stat"><Users :size="12" /> {{ totalTitled }} people titled</span>
        </div>
      </template>

      <div class="dz-powers">
        <Share2 :size="12" /><span class="dz-powers-lab">Powers</span>
        <button v-for="m in powerLinks" :key="m.label" class="dz-mod" @click="$router.push(m.to)">
          <component :is="m.icon" :size="12" /> {{ m.label }}
        </button>
        <button class="dz-mod alt" @click="$router.push('/admin/hr/settings/departments')">
          <ExternalLink :size="12" /> Departments map here
        </button>
        <button class="dz-mod alt" @click="$router.push('/admin/hr/settings/grades')">
          <ExternalLink :size="12" /> Grades map here
        </button>
      </div>
    </SetSectionHead>

    <!-- signature instrument + intelligence -->
    <div class="dz-hero">
      <Motion as="div" class="dz-spire-wrap"
        :initial="{ opacity: 0, scale: 0.98 }" :animate="{ opacity: 1, scale: 1 }" :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
        <div v-if="loading" class="dz-spire-skel"><span class="dz-skel-beam" /></div>
        <DesignationSpire v-else-if="rows.length" :designations="rows" :usage-by-id="usageById" :grade-by-id="gradeById" @select="openEdit" />
        <div v-else class="dz-spire-empty"><BadgeCheck :size="26" /><p>No titles yet — define the first rung of your org's career ladder.</p></div>
      </Motion>

      <Motion as="aside" class="dz-insight"
        :initial="{ opacity: 0, x: 16 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }">
        <header class="dz-insight-head"><Activity :size="14" /> Hierarchy intelligence</header>
        <div class="dz-insight-row" v-for="(ins, i) in insights" :key="ins.key" :style="{ '--i': i }">
          <span class="dz-insight-ic" :data-tone="ins.tone"><component :is="ins.icon" :size="14" /></span>
          <div class="dz-insight-body">
            <b>{{ ins.value }}</b>
            <span>{{ ins.label }}</span>
          </div>
          <button v-if="ins.action" class="dz-insight-go" @click="ins.action()"><ArrowRight :size="12" /></button>
        </div>
      </Motion>
    </div>

    <!-- filter bar -->
    <div class="dz-bar">
      <div class="dz-search">
        <Search :size="14" />
        <input v-model="q" placeholder="Search titles, codes…" />
      </div>
      <span class="dz-count set-mono">{{ visible.length }} / {{ rows.length }}</span>
    </div>

    <!-- cards -->
    <div v-if="loading" class="dz-grid">
      <div v-for="n in 6" :key="n" class="dz-card-skel" :style="{ '--i': n }"><span class="dz-skel-beam" /></div>
    </div>
    <SetEmptyState v-else-if="!visible.length" :icon="BadgeCheck" accent-color="var(--set-orange)"
      :title="hasFilter ? 'No titles match' : 'No designations yet'"
      :sub="hasFilter ? 'Try a different search or filter.' : 'Titles classify roles, map to pay grades and drive reporting lines + recruitment requisitions.'">
      <button v-if="hasFilter" class="set-btn set-btn-ghost" @click="clearFilters"><FilterX :size="14" /> Clear</button>
      <button v-else class="set-btn set-btn-primary" @click="openCreate"><Plus :size="14" /> New title</button>
    </SetEmptyState>
    <div v-else class="dz-grid">
      <DesignationCard v-for="(d, i) in visible" :key="d.id" :desig="d" :index="i"
        :grade-name="gradeNameOf(d)" :department-name="deptNameOf(d)" :parent-name="parentNameOf(d)"
        :headcount="usageOf(d.id).employees" :direct-reports="usageOf(d.id).reporting_children" :requisitions="usageOf(d.id).requisitions"
        :tier="tierMap[String(d.id)]?.idx || 0" :max-tier="maxTierIdx" :tier-label="tierMap[String(d.id)]?.label || 'Title'"
        @edit="openEdit" @delete="openDelete" @focus-parent="focusParent" @view-people="viewPeople" />
    </div>

    <MasterUpsertModal :open="formOpen" :domain="domain" :edit-target="editTarget" :ref-data="refData" :saving="saving"
      @close="formOpen = false" @save="save" />
    <DesignationDeleteModal :open="delOpen" :loading="deleting" :target="delTarget" :usage="delUsage"
      :grade-name="delTarget ? gradeNameOf(delTarget) : ''" :department-name="delTarget ? deptNameOf(delTarget) : ''"
      :parent-name="delTarget ? parentNameOf(delTarget) : ''"
      @close="delOpen = false" @confirm="doDelete" @view-people="viewPeople" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'
import axios from 'axios'
import {
  BadgeCheck, RefreshCw, Plus, Layers, Crown, GitFork, UserMinus, Users, Share2, ExternalLink,
  Search, FilterX, Activity, ArrowRight, TrendingUp, Unlink, UserPlus,
} from 'lucide-vue-next'
import { API, authHeader } from '@/utils/api'
import SetSectionHead from '../components/SetSectionHead.vue'
import SetEmptyState from '../components/SetEmptyState.vue'
import DesignationSpire from '../components/DesignationSpire.vue'
import DesignationCard from '../components/DesignationCard.vue'
import MasterUpsertModal from '../components/MasterUpsertModal.vue'
import DesignationDeleteModal from '../components/DesignationDeleteModal.vue'
import { MASTER_DOMAINS } from '../components/masterDomains'
import { MODULES } from '../components/connectivity'
import { listMaster, createMaster, updateMaster, errText } from '../composables/useHrSettings'
import { syncReferenceSlice } from '@/composables/useEmployees'

const toast = useToast()
const router = useRouter()
const domain = MASTER_DOMAINS['designations']

const rows = ref([])
const grades = ref([])
const depts = ref([])
const usageById = ref({})
const loading = ref(false)
const q = ref('')
const lens = ref('all')

const h = () => ({ headers: authHeader() })

async function fetchUsage() {
  try {
    const res = await axios.get(`${API}/hr/designations/usage`, h())
    usageById.value = res.data?.items || {}
  } catch { usageById.value = {} }
}

async function reload() {
  loading.value = true
  try {
    const [list, gr, dp] = await Promise.all([
      listMaster('designations'),
      listMaster('grades').catch(() => []),
      listMaster('departments').catch(() => []),
    ])
    rows.value = list
    grades.value = gr
    depts.value = dp
    syncReferenceSlice('designations', list)
    await fetchUsage()
  } catch (e) {
    toast.error(errText(e, 'Failed to load designations'))
  } finally { loading.value = false }
}
onMounted(reload)

// ── lookup maps ──────────────────────────────────────────────────────────────
const byId = computed(() => Object.fromEntries(rows.value.map(d => [String(d.id), d])))
const gradeById = computed(() => Object.fromEntries(grades.value.map(g => [String(g.id), { name: g.name, code: g.code }])))
const deptById = computed(() => Object.fromEntries(depts.value.map(d => [String(d.id), d.name])))

const usageOf = (id) => usageById.value[String(id)] || { employees: 0, reporting_children: 0, requisitions: 0, positions: 0 }
const gradeNameOf = (d) => gradeById.value[String(d.grade_id)]?.name || ''
const deptNameOf = (d) => deptById.value[String(d.department_id)] || ''
const parentNameOf = (d) => {
  const pid = d.reporting_to_designation_id ? String(d.reporting_to_designation_id) : ''
  return pid && byId.value[pid] ? byId.value[pid].name : ''
}

// ── reporting-depth tiering (mirrors the spire) ──────────────────────────────
const depthOf = computed(() => {
  const map = {}
  const resolve = (id, guard) => {
    const sid = String(id)
    if (sid in map) return map[sid]
    const d = byId.value[sid]
    const pid = d?.reporting_to_designation_id ? String(d.reporting_to_designation_id) : null
    if (!pid || !byId.value[pid] || guard.has(sid)) { map[sid] = 0; return 0 }
    guard.add(sid)
    const v = resolve(pid, guard) + 1
    map[sid] = v
    return v
  }
  for (const d of rows.value) resolve(d.id, new Set())
  return map
})
const hasReporting = computed(() => rows.value.some(d => d.reporting_to_designation_id && byId.value[String(d.reporting_to_designation_id)]))
const hasLevels = computed(() => rows.value.some(d => d.level != null && d.level !== ''))

const tierMap = computed(() => {
  const out = {}
  if (hasReporting.value) {
    for (const d of rows.value) {
      const dep = depthOf.value[String(d.id)] || 0
      out[String(d.id)] = { idx: dep, label: dep === 0 ? 'Top of chain' : `Tier ${dep + 1}` }
    }
  } else if (hasLevels.value) {
    const levels = [...new Set(rows.value.map(d => (d.level == null || d.level === '') ? null : Number(d.level)))]
      .sort((a, b) => (b ?? -1) - (a ?? -1)) // desc; null last
    for (const d of rows.value) {
      const lv = (d.level == null || d.level === '') ? null : Number(d.level)
      out[String(d.id)] = { idx: levels.indexOf(lv), label: lv == null ? 'Unranked' : `Level ${lv}` }
    }
  } else {
    for (const d of rows.value) out[String(d.id)] = { idx: 0, label: 'Title' }
  }
  return out
})
const maxTierIdx = computed(() => Math.max(0, ...Object.values(tierMap.value).map(t => t.idx)))

// ── lens counts ──────────────────────────────────────────────────────────────
const topCount = computed(() => rows.value.filter(d => !d.reporting_to_designation_id || !byId.value[String(d.reporting_to_designation_id)]).length)
const linkedCount = computed(() => rows.value.filter(d => d.reporting_to_designation_id && byId.value[String(d.reporting_to_designation_id)]).length)
const vacantCount = computed(() => rows.value.filter(d => usageOf(d.id).employees === 0).length)
const totalTitled = computed(() => rows.value.reduce((a, d) => a + usageOf(d.id).employees, 0))

const setLens = (k) => { lens.value = lens.value === k ? 'all' : k }
const hasFilter = computed(() => !!q.value || lens.value !== 'all')
const visible = computed(() => {
  const term = q.value.trim().toLowerCase()
  return rows.value.filter(d => {
    const linked = d.reporting_to_designation_id && byId.value[String(d.reporting_to_designation_id)]
    if (lens.value === 'top' && linked) return false
    if (lens.value === 'linked' && !linked) return false
    if (lens.value === 'vacant' && usageOf(d.id).employees > 0) return false
    if (term && ![d.name, d.code].some(v => String(v || '').toLowerCase().includes(term))) return false
    return true
  })
})
const clearFilters = () => { q.value = ''; lens.value = 'all' }

const refData = computed(() => ({ self: rows.value, grades: grades.value, departments: depts.value }))
const powerLinks = ['employees', 'recruitment'].map(s => ({ ...MODULES[s] })).filter(m => m.label)

// ── hierarchy intelligence ───────────────────────────────────────────────────
const insights = computed(() => {
  const out = []
  // deepest reporting chain
  let deepest = null, maxD = -1
  for (const d of rows.value) {
    const dep = depthOf.value[String(d.id)] || 0
    if (dep > maxD) { maxD = dep; deepest = d }
  }
  if (hasReporting.value && deepest) {
    out.push({ key: 'deep', icon: TrendingUp, tone: 'gold', value: `${maxD + 1} levels deep`, label: `Longest chain ends at ${deepest.name}`, action: () => openEdit(deepest) })
  } else {
    out.push({ key: 'flat', icon: GitFork, tone: hasReporting.value ? 'ok' : 'warn', value: hasReporting.value ? 'Wired' : 'Flat', label: hasReporting.value ? 'reporting lines are set' : 'no reporting lines set yet — titles sit on one tier', action: null })
  }
  // titles without a grade
  const noGrade = rows.value.filter(d => !d.grade_id).length
  out.push({ key: 'nograde', icon: Layers, tone: noGrade ? 'warn' : 'ok', value: noGrade, label: noGrade ? 'titles not mapped to a pay grade' : 'every title maps to a grade', action: noGrade ? () => { q.value = ''; lens.value = 'all' } : null })
  // vacant titles
  out.push({ key: 'vacant', icon: UserMinus, tone: vacantCount.value ? 'warn' : 'ok', value: vacantCount.value, label: vacantCount.value ? 'titles nobody currently holds' : 'every title is held by someone', action: vacantCount.value ? () => setLens('vacant') : null })
  // broken reporting lines (points at a missing/deleted designation)
  const broken = rows.value.filter(d => d.reporting_to_designation_id && !byId.value[String(d.reporting_to_designation_id)]).length
  if (broken) {
    out.push({ key: 'broken', icon: Unlink, tone: 'warn', value: broken, label: 'titles report to a removed title — re-point them', action: () => setLens('linked') })
  } else {
    const hiring = rows.value.filter(d => usageOf(d.id).requisitions > 0).length
    out.push({ key: 'hiring', icon: UserPlus, tone: hiring ? 'gold' : 'ok', value: hiring, label: hiring ? 'titles have open requisitions' : 'no open requisitions on any title', action: hiring ? () => router.push('/admin/hr/recruitment/requisitions') : null })
  }
  return out
})

// ── CRUD ─────────────────────────────────────────────────────────────────────
const formOpen = ref(false)
const editTarget = ref(null)
const saving = ref(false)
const openCreate = () => { editTarget.value = null; formOpen.value = true }
const openEdit = (d) => { editTarget.value = d; formOpen.value = true }

function buildPayload(form) {
  const out = {}
  for (const f of domain.fields) {
    let v = form[f.key]
    if (f.type === 'select') v = (v === '' || v === undefined) ? null : v
    else if (f.type === 'number') v = (v === '' || v === null || v === undefined) ? null : Number(v)
    out[f.key] = v
  }
  return out
}
async function save(form) {
  saving.value = true
  try {
    const payload = buildPayload(form)
    if (editTarget.value) await updateMaster('designations', editTarget.value.id, payload)
    else await createMaster('designations', payload)
    toast.success(editTarget.value ? 'Designation updated' : 'Designation created')
    formOpen.value = false
    await reload()
  } catch (e) { toast.error(errText(e, 'Failed to save designation')) }
  finally { saving.value = false }
}

// ── delete (with authoritative pre-flight usage + reason) ────────────────────
const delOpen = ref(false)
const delTarget = ref(null)
const deleting = ref(false)
const delUsage = ref({ employees: 0, reporting_children: 0, requisitions: 0, positions: 0 })
async function openDelete(d) {
  delTarget.value = d
  delUsage.value = usageOf(d.id) // optimistic from the bulk map
  delOpen.value = true
  try { // authoritative fresh count at delete time
    const res = await axios.get(`${API}/hr/designations/${d.id}/usage`, h())
    if (res.data) delUsage.value = res.data
  } catch { /* keep optimistic */ }
}
async function doDelete(reason) {
  deleting.value = true
  try {
    await axios.delete(`${API}/hr/designations/${delTarget.value.id}`, { ...h(), params: reason ? { reason } : {} })
    toast.success('Designation retired')
    delOpen.value = false
    await reload()
  } catch (e) { toast.error(errText(e, 'Reassign referencing records first')) }
  finally { deleting.value = false }
}

// ── connectivity ─────────────────────────────────────────────────────────────
const viewPeople = (d) => router.push({ path: '/admin/hr/employees/all', query: { designation_id: d.id } })
const focusParent = (d) => {
  const p = byId.value[String(d.reporting_to_designation_id)]
  if (p) openEdit(p)
}
</script>

<style scoped>
.dz { display: flex; flex-direction: column; gap: 16px; }
.dz-lenses { display: flex; flex-wrap: wrap; gap: 8px; }
.dz-lenses .set-chip b { color: var(--set-text); }
.dz-lens-stat { cursor: default; }

.dz-powers { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--set-border); }
.dz-powers > svg { color: var(--set-text-dim); }
.dz-powers-lab { font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--set-text-dim); }
.dz-mod { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; cursor: pointer; font: inherit;
  font-size: 11.5px; font-weight: 600; color: var(--set-text-secondary); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); }
.dz-mod:hover { color: var(--set-orange); border-color: color-mix(in srgb, var(--set-orange) 36%, transparent); transform: translateY(-1px); }
.dz-mod :deep(svg) { color: var(--set-orange); }
.dz-mod.alt { color: var(--set-text-muted); }
.dz-mod.alt :deep(svg) { color: var(--set-text-muted); }

/* hero */
.dz-hero { display: grid; grid-template-columns: 1.55fr 1fr; gap: 16px; align-items: start; }
@media (max-width: 940px) { .dz-hero { grid-template-columns: 1fr; } }
.dz-spire-wrap { min-width: 0; }
.dz-spire-skel { position: relative; overflow: hidden; width: 100%; min-height: 360px; border-radius: 18px; background: var(--set-surface); border: 1px solid var(--set-border); }
.dz-spire-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; width: 100%; min-height: 360px;
  border-radius: 18px; background: var(--set-surface); border: 1px dashed var(--set-border-strong); color: var(--set-text-dim); text-align: center; padding: 20px; }
.dz-spire-empty :deep(svg) { color: var(--set-orange); }
.dz-spire-empty p { margin: 0; font-size: 12.5px; max-width: 26ch; }

.dz-insight { display: flex; flex-direction: column; gap: 9px; padding: 16px; border-radius: 18px; background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow); }
.dz-insight-head { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-orange); margin-bottom: 4px; }
.dz-insight-head :deep(svg) { color: var(--set-orange); }
.dz-insight-row { display: flex; align-items: center; gap: 11px; padding: 10px 11px; border-radius: 12px; background: var(--set-panel); border: 1px solid var(--set-border);
  animation: set-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.07s + 0.15s); }
.dz-insight-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; }
.dz-insight-ic[data-tone="gold"] { color: var(--set-gold); background: color-mix(in srgb, var(--set-gold) 14%, transparent); }
.dz-insight-ic[data-tone="warn"] { color: var(--set-partial); background: var(--set-partial-soft); }
.dz-insight-ic[data-tone="ok"] { color: var(--set-ok); background: var(--set-ok-soft); }
.dz-insight-body { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.25; }
.dz-insight-body b { font-size: 14px; font-weight: 850; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dz-insight-body span { font-size: 10.5px; color: var(--set-text-muted); }
.dz-insight-go { width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0; display: grid; place-items: center; cursor: pointer;
  color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s; }
.dz-insight-go:hover { color: var(--set-orange); border-color: color-mix(in srgb, var(--set-orange) 36%, transparent); transform: translateX(2px); }

/* filter bar */
.dz-bar { display: flex; align-items: center; gap: 12px; }
.dz-search { flex: 1; min-width: 200px; display: flex; align-items: center; gap: 8px; padding: 9px 13px; border-radius: 11px; background: var(--set-surface); border: 1px solid var(--set-border); color: var(--set-text-dim); }
.dz-search:focus-within { border-color: var(--set-border-warm); }
.dz-search input { flex: 1; min-width: 0; border: none; background: none; outline: none; font: inherit; font-size: 13px; color: var(--set-text); }
.dz-count { font-size: 11px; color: var(--set-text-dim); }

/* cards */
.dz-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
@media (max-width: 480px) { .dz-grid { grid-template-columns: 1fr; } }
.dz-card-skel { position: relative; overflow: hidden; height: 220px; border-radius: 16px; background: var(--set-surface); border: 1px solid var(--set-border);
  animation: set-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.06s); }
.dz-skel-beam { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(251,191,36,0.08) 50%, transparent 70%); background-size: 220% 100%; animation: set-sheen 1.5s ease infinite; }

@media (prefers-reduced-motion: reduce) {
  .dz-insight-row, .dz-card-skel { animation: none; }
  .dz-skel-beam { animation: none; }
}
</style>
