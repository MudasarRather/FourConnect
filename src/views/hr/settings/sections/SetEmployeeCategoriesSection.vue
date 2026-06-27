<template>
  <div class="ec">
    <SetSectionHead eyebrow="Workforce · Classification" title="Employee" accent="Categories"
      accent-color="var(--set-ember)" :icon="UsersRound"
      sub="How staff are classified — permanent, probationary, contract, trainee and any class you add. Each classification scopes leave, payroll, travel and exit rules, and the built-ins drive the employee lifecycle. Tune the strata here; the org reads it live.">
      <template #actions>
        <button class="set-btn set-btn-steel" :disabled="loading" @click="reload" title="Refresh">
          <RefreshCw :size="14" :class="{ 'set-spin': loading }" />
        </button>
        <Motion as="button" type="button" class="set-btn set-btn-primary" :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="openCreate">
          <Plus :size="14" /> New classification
        </Motion>
      </template>

      <template #lenses>
        <div class="ec-lenses">
          <button class="set-chip" :class="{ on: lens === 'all' }" style="--acc: var(--set-ember)" @click="lens = 'all'">
            <Layers3 :size="12" /> All <b>{{ rows.length }}</b>
          </button>
          <button class="set-chip" :class="{ on: lens === 'active' }" style="--acc: var(--set-ok)" @click="setLens('active')">
            <Power :size="12" /> Active <b>{{ activeCount }}</b>
          </button>
          <button class="set-chip" :class="{ on: lens === 'inactive' }" style="--acc: var(--set-partial)" @click="setLens('inactive')">
            <PowerOff :size="12" /> Inactive <b>{{ rows.length - activeCount }}</b>
          </button>
          <button class="set-chip" :class="{ on: lens === 'system' }" style="--acc: var(--set-gold)" @click="setLens('system')">
            <Lock :size="12" /> Built-in <b>{{ systemCount }}</b>
          </button>
          <span class="set-chip ec-lens-stat"><Users :size="12" /> {{ totalClassified }} classified</span>
        </div>
      </template>

      <div class="ec-powers">
        <Share2 :size="12" /><span class="ec-powers-lab">Powers</span>
        <button v-for="m in powerLinks" :key="m.label" class="ec-mod" @click="$router.push(m.to)">
          <component :is="m.icon" :size="12" /> {{ m.label }}
        </button>
        <button class="ec-mod alt" @click="$router.push('/admin/hr/settings/employment-types')">
          <ExternalLink :size="12" /> Employment types
        </button>
      </div>
    </SetSectionHead>

    <!-- signature instrument + composition intelligence -->
    <div class="ec-hero">
      <Motion as="div" class="ec-strata-wrap"
        :initial="{ opacity: 0, scale: 0.98 }" :animate="{ opacity: 1, scale: 1 }" :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
        <div v-if="loading" class="ec-strata-skel"><span class="ec-skel-beam" /></div>
        <CohortStrata v-else-if="rows.length" :categories="rows" :usage-by-code="usageByCode" :unclassified="unclassified" @select="openEdit" />
        <div v-else class="ec-strata-empty"><UsersRound :size="26" /><p>No classifications yet — define how your workforce is grouped.</p></div>
      </Motion>

      <Motion as="aside" class="ec-insight"
        :initial="{ opacity: 0, x: 16 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }">
        <header class="ec-insight-head"><Activity :size="14" /> Composition intelligence</header>
        <div class="ec-insight-row" v-for="(ins, i) in insights" :key="ins.key" :style="{ '--i': i }">
          <span class="ec-insight-ic" :data-tone="ins.tone"><component :is="ins.icon" :size="14" /></span>
          <div class="ec-insight-body">
            <b>{{ ins.value }}</b>
            <span>{{ ins.label }}</span>
          </div>
          <button v-if="ins.action" class="ec-insight-go" @click="ins.action()"><ArrowRight :size="12" /></button>
        </div>
      </Motion>
    </div>

    <!-- filter bar -->
    <div class="ec-bar">
      <div class="ec-search">
        <Search :size="14" />
        <input v-model="q" placeholder="Search classifications, codes…" />
      </div>
      <span class="ec-count set-mono">{{ visible.length }} / {{ rows.length }}</span>
    </div>

    <!-- cards -->
    <div v-if="loading" class="ec-grid">
      <div v-for="n in 6" :key="n" class="ec-card-skel" :style="{ '--i': n }"><span class="ec-skel-beam" /></div>
    </div>
    <SetEmptyState v-else-if="!visible.length" :icon="UsersRound" accent-color="var(--set-ember)"
      :title="hasFilter ? 'No classifications match' : 'No employee categories yet'"
      :sub="hasFilter ? 'Try a different search or filter.' : 'Staff classifications that scope leave, payroll, travel and exit rules.'">
      <button v-if="hasFilter" class="set-btn set-btn-ghost" @click="clearFilters"><FilterX :size="14" /> Clear</button>
      <button v-else class="set-btn set-btn-primary" @click="openCreate"><Plus :size="14" /> New classification</button>
    </SetEmptyState>
    <div v-else class="ec-grid">
      <EmployeeCategoryCard v-for="(c, i) in visible" :key="c.id" :category="c" :index="i"
        :headcount="usageOf(c.code)" :share="shareOf(c.code)" :has-workforce="totalClassified > 0"
        @edit="openEdit" @delete="openDelete" @toggle="toggleActive" @view="viewPeople" />
    </div>

    <MasterUpsertModal :open="formOpen" :domain="domain" :edit-target="editTarget" :ref-data="{}" :saving="saving"
      :lock-code="!!editTarget?.is_system" @close="formOpen = false" @save="save" />
    <EmployeeCategoryDeleteModal :open="delOpen" :loading="deleting" :target="delTarget"
      :headcount="delTarget ? usageOf(delTarget.code) : 0" :share="delTarget ? shareOf(delTarget.code) : 0" :has-workforce="totalClassified > 0"
      @close="delOpen = false" @confirm="doDelete" @deactivate="doDeactivate" @view-people="viewPeople" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'
import axios from 'axios'
import {
  UsersRound, RefreshCw, Plus, Layers3, Power, PowerOff, Lock, Users, Share2, ExternalLink,
  Search, FilterX, Activity, ArrowRight, Crown, Ghost, Sparkles, CircleSlash, UserCog,
} from 'lucide-vue-next'
import { API, authHeader } from '@/utils/api'
import SetSectionHead from '../components/SetSectionHead.vue'
import SetEmptyState from '../components/SetEmptyState.vue'
import CohortStrata from '../components/CohortStrata.vue'
import EmployeeCategoryCard from '../components/EmployeeCategoryCard.vue'
import MasterUpsertModal from '../components/MasterUpsertModal.vue'
import EmployeeCategoryDeleteModal from '../components/EmployeeCategoryDeleteModal.vue'
import { MASTER_DOMAINS } from '../components/masterDomains'
import { MODULES } from '../components/connectivity'
import { listMaster, createMaster, updateMaster, deleteMaster, errText } from '../composables/useHrSettings'
import { syncReferenceSlice } from '@/composables/useEmployees'

const toast = useToast()
const router = useRouter()
const domain = MASTER_DOMAINS['employee-categories']
const BASE = domain.base // 'settings/masters/employee-categories'

const rows = ref([])
const usageByCode = ref({})
const totalEmployees = ref(0)
const loading = ref(false)
const q = ref('')
const lens = ref('all')

const h = () => ({ headers: authHeader() })

async function fetchUsage() {
  try {
    const res = await axios.get(`${API}/hr/${BASE}/usage`, h())
    usageByCode.value = res.data?.items || {}
  } catch { usageByCode.value = {} }
}
async function fetchTotal() {
  try {
    const res = await axios.get(`${API}/hr/employees/`, { ...h(), params: { page: 1, limit: 1 } })
    totalEmployees.value = Number(res.data?.total || 0)
  } catch { totalEmployees.value = 0 }
}

async function reload() {
  loading.value = true
  try {
    const list = await listMaster(BASE)
    rows.value = list
    syncReferenceSlice(BASE, list)
    await Promise.all([fetchUsage(), fetchTotal()])
  } catch (e) {
    toast.error(errText(e, 'Failed to load employee categories'))
  } finally { loading.value = false }
}
onMounted(reload)

// ── derived ──
const usageOf = (code) => Number(usageByCode.value[code] || 0)
const totalClassified = computed(() => rows.value.reduce((a, c) => a + usageOf(c.code), 0))
const unclassified = computed(() => Math.max(0, totalEmployees.value - Object.values(usageByCode.value).reduce((a, b) => a + Number(b || 0), 0)))
const shareOf = (code) => (totalClassified.value ? Math.round((usageOf(code) / totalClassified.value) * 100) : 0)
const activeCount = computed(() => rows.value.filter((c) => c.is_active).length)
const systemCount = computed(() => rows.value.filter((c) => c.is_system).length)

const setLens = (k) => { lens.value = lens.value === k ? 'all' : k }
const hasFilter = computed(() => !!q.value || lens.value !== 'all')
const visible = computed(() => {
  const term = q.value.trim().toLowerCase()
  return rows.value.filter((c) => {
    if (lens.value === 'active' && !c.is_active) return false
    if (lens.value === 'inactive' && c.is_active) return false
    if (lens.value === 'system' && !c.is_system) return false
    if (term && ![c.label, c.code, c.description].some((v) => String(v || '').toLowerCase().includes(term))) return false
    return true
  })
})
const clearFilters = () => { q.value = ''; lens.value = 'all' }

const powerLinks = ['employees', 'payroll', 'exit'].map((s) => ({ ...MODULES[s] })).filter((m) => m.label)

// ── composition intelligence ──
const insights = computed(() => {
  const out = []
  let dominant = null, max = -1
  for (const c of rows.value) { const u = usageOf(c.code); if (u > max) { max = u; dominant = c } }
  if (dominant && totalClassified.value > 0) {
    out.push({ key: 'dom', icon: Crown, tone: 'gold', value: `${dominant.label} · ${shareOf(dominant.code)}%`, label: 'largest share of the workforce', action: () => openEdit(dominant) })
  } else {
    out.push({ key: 'dom', icon: Users, tone: 'warn', value: '0', label: 'no one classified yet — set a category on hiring', action: () => router.push('/admin/hr/employees/all') })
  }
  // probation pipeline — surfaces the category↔lifecycle connectivity
  const probationCode = rows.value.find((c) => String(c.code).toUpperCase().includes('PROBATION'))?.code
  const onProbation = probationCode ? usageOf(probationCode) : 0
  out.push({ key: 'prob', icon: UserCog, tone: onProbation ? 'warn' : 'ok', value: onProbation, label: onProbation ? 'on probation — pending confirmation' : 'nobody currently on probation', action: () => router.push('/admin/hr/employees/probation') })
  // ghost: deactivated classification still on live records (the loophole)
  const ghost = rows.value.filter((c) => !c.is_active && usageOf(c.code) > 0).reduce((a, c) => a + usageOf(c.code), 0)
  out.push({ key: 'ghost', icon: Ghost, tone: ghost ? 'warn' : 'ok', value: ghost, label: ghost ? 'people on a deactivated classification — re-classify them' : 'no live record on a deactivated class', action: ghost ? () => setLens('inactive') : null })
  // custom additions
  const custom = rows.value.filter((c) => !c.is_system).length
  out.push({ key: 'custom', icon: custom ? Sparkles : CircleSlash, tone: 'gold', value: custom, label: custom ? `custom class${custom === 1 ? '' : 'es'} beyond the built-ins` : 'using the built-in classes only' })
  return out
})

// ── CRUD ──
const formOpen = ref(false)
const editTarget = ref(null)
const saving = ref(false)
const openCreate = () => { editTarget.value = null; formOpen.value = true }
const openEdit = (c) => { editTarget.value = c; formOpen.value = true }

function buildPayload(form) {
  const out = {}
  for (const f of domain.fields) {
    let v = form[f.key]
    if (f.type === 'number') v = (v === '' || v === null || v === undefined) ? null : Number(v)
    out[f.key] = v
  }
  return out
}
async function save(form) {
  saving.value = true
  try {
    const payload = buildPayload(form)
    if (editTarget.value) await updateMaster(BASE, editTarget.value.id, payload)
    else await createMaster(BASE, payload)
    toast.success(editTarget.value ? 'Classification updated' : 'Classification created')
    formOpen.value = false
    await reload()
  } catch (e) { toast.error(errText(e, 'Failed to save classification')) }
  finally { saving.value = false }
}

async function toggleActive(c) {
  if (c.is_system) return
  const next = !c.is_active
  c.is_active = next
  try { await updateMaster(BASE, c.id, { is_active: next }) }
  catch (e) { c.is_active = !next; toast.error(errText(e, 'Failed to update')) }
}

// ── delete + deactivate ──
const delOpen = ref(false)
const delTarget = ref(null)
const deleting = ref(false)
const openDelete = (c) => { delTarget.value = c; delOpen.value = true }
async function doDelete(reason) {
  deleting.value = true
  try {
    await deleteMaster(BASE, delTarget.value.id, reason)
    toast.success('Classification removed')
    delOpen.value = false
    await reload()
  } catch (e) { toast.error(errText(e, 'Re-classify or deactivate instead')) }
  finally { deleting.value = false }
}
async function doDeactivate(c) {
  deleting.value = true
  try {
    await updateMaster(BASE, c.id, { is_active: false })
    toast.success(`${c.label} deactivated — hidden from new hires`)
    delOpen.value = false
    await reload()
  } catch (e) { toast.error(errText(e, 'Failed to deactivate')) }
  finally { deleting.value = false }
}

// ── connectivity ──
const viewPeople = (c) => router.push({ path: '/admin/hr/employees/all', query: { employee_category: c.code } })
</script>

<style scoped>
.ec { display: flex; flex-direction: column; gap: 16px; }
.ec-lenses { display: flex; flex-wrap: wrap; gap: 8px; }
.ec-lenses .set-chip b { color: var(--set-text); }
.ec-lens-stat { cursor: default; }

.ec-powers { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--set-border); }
.ec-powers > svg { color: var(--set-text-dim); }
.ec-powers-lab { font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--set-text-dim); }
.ec-mod { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; cursor: pointer; font: inherit;
  font-size: 11.5px; font-weight: 600; color: var(--set-text-secondary); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); }
.ec-mod:hover { color: var(--set-ember); border-color: color-mix(in srgb, var(--set-ember) 36%, transparent); transform: translateY(-1px); }
.ec-mod :deep(svg) { color: var(--set-ember); }
.ec-mod.alt { color: var(--set-text-muted); }
.ec-mod.alt :deep(svg) { color: var(--set-text-muted); }

.ec-hero { display: grid; grid-template-columns: 1.55fr 1fr; gap: 16px; align-items: start; }
@media (max-width: 940px) { .ec-hero { grid-template-columns: 1fr; } }
.ec-strata-wrap { min-width: 0; }
.ec-strata-skel { position: relative; overflow: hidden; width: 100%; min-height: 380px; border-radius: 18px; background: var(--set-surface); border: 1px solid var(--set-border); }
.ec-strata-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; width: 100%; min-height: 380px;
  border-radius: 18px; background: var(--set-surface); border: 1px dashed var(--set-border-strong); color: var(--set-text-dim); text-align: center; padding: 20px; }
.ec-strata-empty :deep(svg) { color: var(--set-ember); }
.ec-strata-empty p { margin: 0; font-size: 12.5px; max-width: 26ch; }

.ec-insight { display: flex; flex-direction: column; gap: 9px; padding: 16px; border-radius: 18px; background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow); }
.ec-insight-head { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-ember); margin-bottom: 4px; }
.ec-insight-head :deep(svg) { color: var(--set-ember); }
.ec-insight-row { display: flex; align-items: center; gap: 11px; padding: 10px 11px; border-radius: 12px; background: var(--set-panel); border: 1px solid var(--set-border);
  animation: set-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.07s + 0.15s); }
.ec-insight-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; }
.ec-insight-ic[data-tone="gold"] { color: var(--set-gold); background: color-mix(in srgb, var(--set-gold) 14%, transparent); }
.ec-insight-ic[data-tone="warn"] { color: var(--set-partial); background: var(--set-partial-soft); }
.ec-insight-ic[data-tone="ok"] { color: var(--set-ok); background: var(--set-ok-soft); }
.ec-insight-body { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.25; }
.ec-insight-body b { font-size: 14px; font-weight: 850; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ec-insight-body span { font-size: 10.5px; color: var(--set-text-muted); }
.ec-insight-go { width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0; display: grid; place-items: center; cursor: pointer;
  color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s; }
.ec-insight-go:hover { color: var(--set-ember); border-color: color-mix(in srgb, var(--set-ember) 36%, transparent); transform: translateX(2px); }

.ec-bar { display: flex; align-items: center; gap: 12px; }
.ec-search { flex: 1; min-width: 200px; display: flex; align-items: center; gap: 8px; padding: 9px 13px; border-radius: 11px; background: var(--set-surface); border: 1px solid var(--set-border); color: var(--set-text-dim); }
.ec-search:focus-within { border-color: var(--set-border-warm); }
.ec-search input { flex: 1; min-width: 0; border: none; background: none; outline: none; font: inherit; font-size: 13px; color: var(--set-text); }
.ec-count { font-size: 11px; color: var(--set-text-dim); }

.ec-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
@media (max-width: 480px) { .ec-grid { grid-template-columns: 1fr; } }
.ec-card-skel { position: relative; overflow: hidden; height: 230px; border-radius: 18px; background: var(--set-surface); border: 1px solid var(--set-border);
  animation: set-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.06s); }
.ec-skel-beam { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(217,119,6,0.08) 50%, transparent 70%); background-size: 220% 100%; animation: set-sheen 1.5s ease infinite; }

@media (prefers-reduced-motion: reduce) {
  .ec-insight-row, .ec-card-skel, .ec-skel-beam { animation: none; }
}
</style>
