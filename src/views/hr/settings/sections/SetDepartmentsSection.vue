<template>
  <div class="dp">
    <SetSectionHead eyebrow="Organization · Structure" title="Org" accent="Lattice"
      accent-color="var(--set-gold)" :icon="Building2"
      sub="The department tree that wires headcount, cost centres and reporting lines into Employees, Attendance and Payroll. Build the hierarchy here — every HR module reads it live.">
      <template #actions>
        <button class="set-btn set-btn-steel" :disabled="loading" @click="reload" title="Refresh">
          <RefreshCw :size="14" :class="{ 'set-spin': loading }" />
        </button>
        <Motion as="button" type="button" class="set-btn set-btn-primary"
          :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="openCreate">
          <Plus :size="14" /> New department
        </Motion>
      </template>

      <template #lenses>
        <div class="dp-lenses">
          <button class="set-chip" :class="{ on: lens === 'all' }" style="--acc: var(--set-gold)" @click="lens = 'all'">
            <Layers :size="12" /> All <b>{{ rows.length }}</b>
          </button>
          <button class="set-chip" :class="{ on: lens === 'top' }" style="--acc: var(--set-gold)" @click="lens = lens === 'top' ? 'all' : 'top'">
            Top-level <b>{{ topCount }}</b>
          </button>
          <button class="set-chip" :class="{ on: lens === 'sub' }" style="--acc: var(--set-orange)" @click="lens = lens === 'sub' ? 'all' : 'sub'">
            Sub-depts <b>{{ subCount }}</b>
          </button>
          <button class="set-chip" :class="{ on: lens === 'head' }" style="--acc: var(--set-ok)" @click="lens = lens === 'head' ? 'all' : 'head'">
            <Crown :size="12" /> With head <b>{{ withHeadCount }}</b>
          </button>
          <span class="set-chip dp-lens-stat"><Users :size="12" /> {{ orgHeadcount }} people</span>
        </div>
      </template>

      <div class="dp-powers">
        <Share2 :size="12" /><span class="dp-powers-lab">Powers</span>
        <button v-for="m in powerLinks" :key="m.label" class="dp-mod" @click="$router.push(m.to)">
          <component :is="m.icon" :size="12" /> {{ m.label }}
        </button>
        <button class="dp-mod alt" @click="$router.push('/admin/hr/settings/designations')">
          <ExternalLink :size="12" /> Designations map here
        </button>
      </div>
    </SetSectionHead>

    <!-- signature instrument + insights -->
    <div class="dp-hero">
      <Motion as="div" class="dp-lattice-wrap"
        :initial="{ opacity: 0, scale: 0.98 }" :animate="{ opacity: 1, scale: 1 }" :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
        <div v-if="loading" class="dp-lattice-skel"><span class="dp-skel-beam" /></div>
        <DeptLattice v-else-if="rows.length" :departments="rows" :headcount-by-id="headcountById" @select="openEdit" />
        <div v-else class="dp-lattice-empty"><Building2 :size="26" /><p>No departments yet — create the first node of your org tree.</p></div>
      </Motion>

      <Motion as="aside" class="dp-insight"
        :initial="{ opacity: 0, x: 16 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }">
        <header class="dp-insight-head"><Activity :size="14" /> Org intelligence</header>
        <div class="dp-insight-row" v-for="(ins, i) in insights" :key="ins.key" :style="{ '--i': i }">
          <span class="dp-insight-ic" :data-tone="ins.tone"><component :is="ins.icon" :size="14" /></span>
          <div class="dp-insight-body">
            <b>{{ ins.value }}</b>
            <span>{{ ins.label }}</span>
          </div>
          <button v-if="ins.action" class="dp-insight-go" @click="ins.action()"><ArrowRight :size="12" /></button>
        </div>
      </Motion>
    </div>

    <!-- filter bar -->
    <div class="dp-bar">
      <div class="dp-search">
        <Search :size="14" />
        <input v-model="q" placeholder="Search departments, codes, cost centres…" />
      </div>
      <span class="dp-count set-mono">{{ visible.length }} / {{ rows.length }}</span>
    </div>

    <!-- cards -->
    <div v-if="loading" class="dp-grid">
      <div v-for="n in 6" :key="n" class="dp-card-skel" :style="{ '--i': n }"><span class="dp-skel-beam" /></div>
    </div>
    <SetEmptyState v-else-if="!visible.length" :icon="Building2" accent-color="var(--set-gold)"
      :title="hasFilter ? 'No departments match' : 'No departments yet'"
      :sub="hasFilter ? 'Try a different search or filter.' : 'Departments form the org tree and feed every employee record, attendance roster and payroll cost centre.'">
      <button v-if="hasFilter" class="set-btn set-btn-ghost" @click="clearFilters"><FilterX :size="14" /> Clear</button>
      <button v-else class="set-btn set-btn-primary" @click="openCreate"><Plus :size="14" /> New department</button>
    </SetEmptyState>
    <div v-else class="dp-grid">
      <DeptCard v-for="(d, i) in visible" :key="d.id" :dept="d" :index="i"
        :headcount="hcOf(d.id)" :children-count="childCountOf(d.id)" :parent-name="parentNameOf(d)"
        :head-name="headNameOf(d)" :bar-pct="barPctOf(d.id)"
        @edit="openEdit" @delete="openDelete" @view="viewPeople" @go-parent="goParent" />
    </div>

    <MasterUpsertModal :open="formOpen" :domain="domain" :edit-target="editTarget" :ref-data="refData" :saving="saving"
      @close="formOpen = false" @save="save" />
    <DeptDeleteModal :open="delOpen" :loading="deleting" :target="delTarget"
      :headcount="delTarget ? hcOf(delTarget.id) : 0" :children-count="delTarget ? childCountOf(delTarget.id) : 0"
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
  Building2, RefreshCw, Plus, Layers, Crown, Users, Share2, ExternalLink, Search, FilterX,
  Activity, ArrowRight, Landmark, TriangleAlert,
} from 'lucide-vue-next'
import { API, authHeader } from '@/utils/api'
import SetSectionHead from '../components/SetSectionHead.vue'
import SetEmptyState from '../components/SetEmptyState.vue'
import DeptLattice from '../components/DeptLattice.vue'
import DeptCard from '../components/DeptCard.vue'
import MasterUpsertModal from '../components/MasterUpsertModal.vue'
import DeptDeleteModal from '../components/DeptDeleteModal.vue'
import { MASTER_DOMAINS } from '../components/masterDomains'
import { MODULES } from '../components/connectivity'
import { listMaster, createMaster, updateMaster, deleteMaster, errText } from '../composables/useHrSettings'
import { syncReferenceSlice } from '@/composables/useEmployees'

const toast = useToast()
const router = useRouter()
const domain = MASTER_DOMAINS['departments']

const rows = ref([])
const employees = ref([])
const headcountById = ref({})
const orgHeadcount = ref(0)
const loading = ref(false)
const q = ref('')
const lens = ref('all')

const h = () => ({ headers: authHeader() })
const empName = (e) => e.full_name || e.name || [e.first_name, e.last_name].filter(Boolean).join(' ') || e.employee_id || e.email || 'Employee'

async function fetchEmployees() {
  try {
    const res = await axios.get(`${API}/hr/employees/`, { ...h(), params: { page: 1, limit: 100 } })
    const d = res.data
    employees.value = (Array.isArray(d) ? d : d?.items || []).map(e => ({ id: String(e.id), name: empName(e) }))
    if (d && typeof d.total === 'number') orgHeadcount.value = d.total
  } catch { employees.value = [] }
}

async function deptCount(id) {
  try {
    const res = await axios.get(`${API}/hr/employees/`, { ...h(), params: { department_id: id, page: 1, limit: 1 } })
    return Number(res.data?.total || 0)
  } catch { return 0 }
}

async function reload() {
  loading.value = true
  try {
    const depts = await listMaster('departments')
    rows.value = depts
    syncReferenceSlice('departments', depts)
    await fetchEmployees()
    const counts = await Promise.all(depts.map(d => deptCount(d.id)))
    const map = {}
    depts.forEach((d, i) => { map[d.id] = counts[i] })
    headcountById.value = map
    if (!orgHeadcount.value) orgHeadcount.value = Object.values(map).reduce((a, b) => a + b, 0)
  } catch (e) {
    toast.error(errText(e, 'Failed to load departments'))
  } finally { loading.value = false }
}
onMounted(reload)

// ── derived ──
const empById = computed(() => Object.fromEntries(employees.value.map(e => [String(e.id), e.name])))
const topCount = computed(() => rows.value.filter(d => !d.parent_department_id).length)
const subCount = computed(() => rows.value.filter(d => !!d.parent_department_id).length)
const withHeadCount = computed(() => rows.value.filter(d => !!d.head_employee_id).length)
const maxHc = computed(() => Math.max(1, ...rows.value.map(d => hcOf(d.id))))

const hcOf = (id) => Number(headcountById.value[id] || 0)
const childCountOf = (id) => rows.value.filter(d => String(d.parent_department_id) === String(id)).length
const parentNameOf = (d) => {
  if (!d.parent_department_id) return ''
  const p = rows.value.find(x => String(x.id) === String(d.parent_department_id))
  return p ? p.name : ''
}
const headNameOf = (d) => d.head_employee_id ? (empById.value[String(d.head_employee_id)] || '') : ''
const barPctOf = (id) => Math.round((hcOf(id) / maxHc.value) * 100)

const hasFilter = computed(() => !!q.value || lens.value !== 'all')
const visible = computed(() => {
  const term = q.value.trim().toLowerCase()
  return rows.value.filter(d => {
    if (lens.value === 'top' && d.parent_department_id) return false
    if (lens.value === 'sub' && !d.parent_department_id) return false
    if (lens.value === 'head' && !d.head_employee_id) return false
    if (term && ![d.name, d.code, d.cost_center].some(v => String(v || '').toLowerCase().includes(term))) return false
    return true
  })
})
const clearFilters = () => { q.value = ''; lens.value = 'all' }

const refData = computed(() => ({ self: rows.value, employees: employees.value }))

const powerLinks = ['employees', 'attendance', 'payroll'].map(s => ({ ...MODULES[s] })).filter(m => m.label)

// ── org intelligence insights ──
const insights = computed(() => {
  const out = []
  const largest = [...rows.value].sort((a, b) => hcOf(b.id) - hcOf(a.id))[0]
  if (largest) out.push({ key: 'largest', icon: Users, tone: 'gold', value: `${largest.name} · ${hcOf(largest.id)}`, label: 'Largest department by headcount', action: () => openEdit(largest) })
  const noHead = rows.value.filter(d => !d.head_employee_id).length
  out.push({ key: 'nohead', icon: Crown, tone: noHead ? 'warn' : 'ok', value: noHead, label: noHead ? 'departments have no head assigned' : 'every department has a head', action: noHead ? () => { lens.value = 'all' } : null })
  const noCc = rows.value.filter(d => !d.cost_center).length
  out.push({ key: 'nocc', icon: Landmark, tone: noCc ? 'warn' : 'ok', value: noCc, label: noCc ? 'without a payroll cost centre' : 'all mapped to a cost centre' })
  const assigned = Object.values(headcountById.value).reduce((a, b) => a + b, 0)
  const unassigned = Math.max(0, orgHeadcount.value - assigned)
  out.push({ key: 'unassigned', icon: TriangleAlert, tone: unassigned ? 'warn' : 'ok', value: unassigned, label: unassigned ? 'people not mapped to any department' : 'everyone is mapped to a department', action: unassigned ? viewAllPeople : null })
  return out
})

// ── CRUD ──
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
    out[f.key] = v
  }
  return out
}
async function save(form) {
  saving.value = true
  try {
    const payload = buildPayload(form)
    if (editTarget.value) await updateMaster('departments', editTarget.value.id, payload)
    else await createMaster('departments', payload)
    toast.success(editTarget.value ? 'Department updated' : 'Department created')
    formOpen.value = false
    await reload()
  } catch (e) { toast.error(errText(e, 'Failed to save department')) }
  finally { saving.value = false }
}

const delOpen = ref(false)
const delTarget = ref(null)
const deleting = ref(false)
const openDelete = (d) => { delTarget.value = d; delOpen.value = true }
async function doDelete(reason) {
  deleting.value = true
  try {
    await deleteMaster('departments', delTarget.value.id)
    toast.success('Department deleted')
    delOpen.value = false
    await reload()
  } catch (e) { toast.error(errText(e, 'Reassign referencing records first')) }
  finally { deleting.value = false }
}

// ── connectivity ──
const viewPeople = (d) => router.push({ path: '/admin/hr/employees/all', query: { department_id: d.id } })
const viewAllPeople = () => router.push('/admin/hr/employees/all')
const goParent = (parentId) => {
  const p = rows.value.find(x => String(x.id) === String(parentId))
  if (p) openEdit(p)
}
</script>

<style scoped>
.dp { display: flex; flex-direction: column; gap: 16px; }
.dp-lenses { display: flex; flex-wrap: wrap; gap: 8px; }
.dp-lenses .set-chip b { color: var(--set-text); }
.dp-lens-stat { cursor: default; }

.dp-powers { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--set-border); }
.dp-powers > svg { color: var(--set-text-dim); }
.dp-powers-lab { font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--set-text-dim); }
.dp-mod { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; cursor: pointer; font: inherit;
  font-size: 11.5px; font-weight: 600; color: var(--set-text-secondary); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); }
.dp-mod:hover { color: var(--set-gold); border-color: color-mix(in srgb, var(--set-gold) 36%, transparent); transform: translateY(-1px); }
.dp-mod :deep(svg) { color: var(--set-gold); }
.dp-mod.alt { color: var(--set-text-muted); }
.dp-mod.alt :deep(svg) { color: var(--set-text-muted); }

/* hero */
.dp-hero { display: grid; grid-template-columns: 1.55fr 1fr; gap: 16px; align-items: stretch; }
@media (max-width: 940px) { .dp-hero { grid-template-columns: 1fr; } }
.dp-lattice-wrap { min-width: 0; }
.dp-lattice-skel { position: relative; overflow: hidden; width: 100%; aspect-ratio: 480/360; border-radius: 18px; background: var(--set-surface); border: 1px solid var(--set-border); }
.dp-lattice-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; width: 100%; aspect-ratio: 480/360;
  border-radius: 18px; background: var(--set-surface); border: 1px dashed var(--set-border-strong); color: var(--set-text-dim); text-align: center; padding: 20px; }
.dp-lattice-empty :deep(svg) { color: var(--set-gold); }
.dp-lattice-empty p { margin: 0; font-size: 12.5px; max-width: 24ch; }

.dp-insight { display: flex; flex-direction: column; gap: 9px; padding: 16px; border-radius: 18px; background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow); }
.dp-insight-head { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-gold); margin-bottom: 4px; }
.dp-insight-head :deep(svg) { color: var(--set-gold); }
.dp-insight-row { display: flex; align-items: center; gap: 11px; padding: 10px 11px; border-radius: 12px; background: var(--set-panel); border: 1px solid var(--set-border);
  animation: set-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.07s + 0.15s); }
.dp-insight-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; }
.dp-insight-ic[data-tone="gold"] { color: var(--set-gold); background: color-mix(in srgb, var(--set-gold) 14%, transparent); }
.dp-insight-ic[data-tone="warn"] { color: var(--set-partial); background: var(--set-partial-soft); }
.dp-insight-ic[data-tone="ok"] { color: var(--set-ok); background: var(--set-ok-soft); }
.dp-insight-body { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.25; }
.dp-insight-body b { font-size: 14px; font-weight: 850; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dp-insight-body span { font-size: 10.5px; color: var(--set-text-muted); }
.dp-insight-go { width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0; display: grid; place-items: center; cursor: pointer;
  color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s; }
.dp-insight-go:hover { color: var(--set-gold); border-color: color-mix(in srgb, var(--set-gold) 36%, transparent); transform: translateX(2px); }

/* filter bar */
.dp-bar { display: flex; align-items: center; gap: 12px; }
.dp-search { flex: 1; min-width: 200px; display: flex; align-items: center; gap: 8px; padding: 9px 13px; border-radius: 11px; background: var(--set-surface); border: 1px solid var(--set-border); color: var(--set-text-dim); }
.dp-search:focus-within { border-color: var(--set-border-warm); }
.dp-search input { flex: 1; min-width: 0; border: none; background: none; outline: none; font: inherit; font-size: 13px; color: var(--set-text); }
.dp-count { font-size: 11px; color: var(--set-text-dim); }

/* cards */
.dp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 14px; }
@media (max-width: 480px) { .dp-grid { grid-template-columns: 1fr; } }
.dp-card-skel { position: relative; overflow: hidden; height: 220px; border-radius: 18px; background: var(--set-surface); border: 1px solid var(--set-border);
  animation: set-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.06s); }
.dp-skel-beam { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(251,191,36,0.08) 50%, transparent 70%); background-size: 220% 100%; animation: set-sheen 1.5s ease infinite; }

@media (prefers-reduced-motion: reduce) {
  .dp-insight-row, .dp-card-skel { animation: none; }
  .dp-skel-beam { animation: none; }
}
</style>
