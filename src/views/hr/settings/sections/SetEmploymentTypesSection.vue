<template>
  <div class="et">
    <SetSectionHead eyebrow="Workforce · Engagement" title="Engagement" accent="Models"
      accent-color="var(--set-deep)" :icon="BriefcaseBusiness"
      sub="How everyone is engaged — full-time, contract, consultant, intern and any model you add. This taxonomy flows into every Employee record, the payroll engine and recruitment. Tune the mix here; the whole org reads it live.">
      <template #actions>
        <button class="set-btn set-btn-steel" :disabled="loading" @click="reload" title="Refresh">
          <RefreshCw :size="14" :class="{ 'set-spin': loading }" />
        </button>
        <Motion as="button" type="button" class="set-btn set-btn-primary" :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="openCreate">
          <Plus :size="14" /> New type
        </Motion>
      </template>

      <template #lenses>
        <div class="et-lenses">
          <button class="set-chip" :class="{ on: lens === 'all' }" style="--acc: var(--set-deep)" @click="lens = 'all'">
            <Layers :size="12" /> All <b>{{ rows.length }}</b>
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
          <span class="set-chip et-lens-stat"><Users :size="12" /> {{ totalEngaged }} engaged</span>
        </div>
      </template>

      <div class="et-powers">
        <Share2 :size="12" /><span class="et-powers-lab">Powers</span>
        <button v-for="m in powerLinks" :key="m.label" class="et-mod" @click="$router.push(m.to)">
          <component :is="m.icon" :size="12" /> {{ m.label }}
        </button>
        <button class="et-mod alt" @click="$router.push('/admin/hr/settings/employee-categories')">
          <ExternalLink :size="12" /> Employee categories
        </button>
      </div>
    </SetSectionHead>

    <!-- signature instrument + composition intelligence -->
    <div class="et-hero">
      <Motion as="div" class="et-orbit-wrap"
        :initial="{ opacity: 0, scale: 0.98 }" :animate="{ opacity: 1, scale: 1 }" :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
        <div v-if="loading" class="et-orbit-skel"><span class="et-skel-beam" /></div>
        <EngagementOrbit v-else-if="rows.length" :types="rows" :usage-by-code="usageByCode" @select="openEdit" />
        <div v-else class="et-orbit-empty"><BriefcaseBusiness :size="26" /><p>No engagement models yet — define how your workforce is engaged.</p></div>
      </Motion>

      <Motion as="aside" class="et-insight"
        :initial="{ opacity: 0, x: 16 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }">
        <header class="et-insight-head"><Activity :size="14" /> Composition intelligence</header>
        <div class="et-insight-row" v-for="(ins, i) in insights" :key="ins.key" :style="{ '--i': i }">
          <span class="et-insight-ic" :data-tone="ins.tone"><component :is="ins.icon" :size="14" /></span>
          <div class="et-insight-body">
            <b>{{ ins.value }}</b>
            <span>{{ ins.label }}</span>
          </div>
          <button v-if="ins.action" class="et-insight-go" @click="ins.action()"><ArrowRight :size="12" /></button>
        </div>
      </Motion>
    </div>

    <!-- filter bar -->
    <div class="et-bar">
      <div class="et-search">
        <Search :size="14" />
        <input v-model="q" placeholder="Search engagement models, codes…" />
      </div>
      <span class="et-count set-mono">{{ visible.length }} / {{ rows.length }}</span>
    </div>

    <!-- cards -->
    <div v-if="loading" class="et-grid">
      <div v-for="n in 6" :key="n" class="et-card-skel" :style="{ '--i': n }"><span class="et-skel-beam" /></div>
    </div>
    <SetEmptyState v-else-if="!visible.length" :icon="BriefcaseBusiness" accent-color="var(--set-deep)"
      :title="hasFilter ? 'No types match' : 'No employment types yet'"
      :sub="hasFilter ? 'Try a different search or filter.' : 'Permanent, contract, intern — the engagement models employees can be hired under.'">
      <button v-if="hasFilter" class="set-btn set-btn-ghost" @click="clearFilters"><FilterX :size="14" /> Clear</button>
      <button v-else class="set-btn set-btn-primary" @click="openCreate"><Plus :size="14" /> New type</button>
    </SetEmptyState>
    <div v-else class="et-grid">
      <EmploymentTypeCard v-for="(t, i) in visible" :key="t.id" :type="t" :index="i"
        :engaged="usageOf(t.code)" :share="shareOf(t.code)" :has-workforce="totalEngaged > 0"
        @edit="openEdit" @delete="openDelete" @toggle="toggleActive" @view="viewPeople" />
    </div>

    <MasterUpsertModal :open="formOpen" :domain="domain" :edit-target="editTarget" :ref-data="{}" :saving="saving"
      :lock-code="!!editTarget?.is_system" @close="formOpen = false" @save="save" />
    <EmploymentTypeDeleteModal :open="delOpen" :loading="deleting" :target="delTarget"
      :engaged="delTarget ? usageOf(delTarget.code) : 0" :share="delTarget ? shareOf(delTarget.code) : 0" :has-workforce="totalEngaged > 0"
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
  BriefcaseBusiness, RefreshCw, Plus, Layers, Power, PowerOff, Lock, Users, Share2, ExternalLink,
  Search, FilterX, Activity, ArrowRight, Crown, Ghost, Sparkles, CircleSlash,
} from 'lucide-vue-next'
import { API, authHeader } from '@/utils/api'
import SetSectionHead from '../components/SetSectionHead.vue'
import SetEmptyState from '../components/SetEmptyState.vue'
import EngagementOrbit from '../components/EngagementOrbit.vue'
import EmploymentTypeCard from '../components/EmploymentTypeCard.vue'
import MasterUpsertModal from '../components/MasterUpsertModal.vue'
import EmploymentTypeDeleteModal from '../components/EmploymentTypeDeleteModal.vue'
import { MASTER_DOMAINS } from '../components/masterDomains'
import { MODULES } from '../components/connectivity'
import { listMaster, createMaster, updateMaster, deleteMaster, errText } from '../composables/useHrSettings'
import { syncReferenceSlice } from '@/composables/useEmployees'

const toast = useToast()
const router = useRouter()
const domain = MASTER_DOMAINS['employment-types']
const BASE = domain.base // 'settings/masters/employment-types'

const rows = ref([])
const usageByCode = ref({})
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

async function reload() {
  loading.value = true
  try {
    const list = await listMaster(BASE)
    rows.value = list
    syncReferenceSlice(BASE, list)
    await fetchUsage()
  } catch (e) {
    toast.error(errText(e, 'Failed to load employment types'))
  } finally { loading.value = false }
}
onMounted(reload)

// ── derived ──
const usageOf = (code) => Number(usageByCode.value[code] || 0)
const totalEngaged = computed(() => rows.value.reduce((a, t) => a + usageOf(t.code), 0))
const shareOf = (code) => totalEngaged.value ? Math.round((usageOf(code) / totalEngaged.value) * 100) : 0
const activeCount = computed(() => rows.value.filter(t => t.is_active).length)
const systemCount = computed(() => rows.value.filter(t => t.is_system).length)

const setLens = (k) => { lens.value = lens.value === k ? 'all' : k }
const hasFilter = computed(() => !!q.value || lens.value !== 'all')
const visible = computed(() => {
  const term = q.value.trim().toLowerCase()
  return rows.value.filter(t => {
    if (lens.value === 'active' && !t.is_active) return false
    if (lens.value === 'inactive' && t.is_active) return false
    if (lens.value === 'system' && !t.is_system) return false
    if (term && ![t.label, t.code, t.description].some(v => String(v || '').toLowerCase().includes(term))) return false
    return true
  })
})
const clearFilters = () => { q.value = ''; lens.value = 'all' }

const powerLinks = ['employees', 'payroll', 'recruitment'].map(s => ({ ...MODULES[s] })).filter(m => m.label)

// ── composition intelligence ──
const insights = computed(() => {
  const out = []
  // dominant model
  let dominant = null, max = -1
  for (const t of rows.value) { const u = usageOf(t.code); if (u > max) { max = u; dominant = t } }
  if (dominant && totalEngaged.value > 0) {
    out.push({ key: 'dom', icon: Crown, tone: 'gold', value: `${dominant.label} · ${shareOf(dominant.code)}%`, label: 'largest share of the workforce', action: () => openEdit(dominant) })
  } else {
    out.push({ key: 'dom', icon: Users, tone: 'warn', value: '0', label: 'no employees engaged yet — assign a type on hiring', action: () => router.push('/admin/hr/employees/all') })
  }
  // deactivated types still on live records (the real loophole)
  const ghostList = rows.value.filter(t => !t.is_active && usageOf(t.code) > 0)
  const ghost = ghostList.reduce((a, t) => a + usageOf(t.code), 0)
  out.push({ key: 'ghost', icon: Ghost, tone: ghost ? 'warn' : 'ok', value: ghost, label: ghost ? 'people on a deactivated type — re-engage them' : 'no live record on a deactivated type', action: ghost ? () => setLens('inactive') : null })
  // unused types
  const unused = rows.value.filter(t => usageOf(t.code) === 0).length
  out.push({ key: 'unused', icon: CircleSlash, tone: unused ? 'warn' : 'ok', value: unused, label: unused ? 'models nobody is engaged in' : 'every model is in use' })
  // custom additions
  const custom = rows.value.filter(t => !t.is_system).length
  out.push({ key: 'custom', icon: Sparkles, tone: 'gold', value: custom, label: custom ? `custom model${custom === 1 ? '' : 's'} added beyond the built-ins` : 'using the built-in models only' })
  return out
})

// ── CRUD ──
const formOpen = ref(false)
const editTarget = ref(null)
const saving = ref(false)
const openCreate = () => { editTarget.value = null; formOpen.value = true }
const openEdit = (t) => { editTarget.value = t; formOpen.value = true }

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
    toast.success(editTarget.value ? 'Employment type updated' : 'Employment type created')
    formOpen.value = false
    await reload()
  } catch (e) { toast.error(errText(e, 'Failed to save employment type')) }
  finally { saving.value = false }
}

async function toggleActive(t) {
  const next = !t.is_active
  t.is_active = next // optimistic
  try { await updateMaster(BASE, t.id, { is_active: next }) }
  catch (e) { t.is_active = !next; toast.error(errText(e, 'Failed to update')) }
}

// ── delete + deactivate ──
const delOpen = ref(false)
const delTarget = ref(null)
const deleting = ref(false)
const openDelete = (t) => { delTarget.value = t; delOpen.value = true }
async function doDelete(reason) {
  deleting.value = true
  try {
    await deleteMaster(BASE, delTarget.value.id, reason)
    toast.success('Employment type retired')
    delOpen.value = false
    await reload()
  } catch (e) { toast.error(errText(e, 'Reassign or deactivate instead')) }
  finally { deleting.value = false }
}
async function doDeactivate(t) {
  deleting.value = true
  try {
    await updateMaster(BASE, t.id, { is_active: false })
    toast.success(`${t.label} deactivated — hidden from new hires`)
    delOpen.value = false
    await reload()
  } catch (e) { toast.error(errText(e, 'Failed to deactivate')) }
  finally { deleting.value = false }
}

// ── connectivity ──
const viewPeople = (t) => router.push({ path: '/admin/hr/employees/all', query: { employment_type: t.code } })
</script>

<style scoped>
.et { display: flex; flex-direction: column; gap: 16px; }
.et-lenses { display: flex; flex-wrap: wrap; gap: 8px; }
.et-lenses .set-chip b { color: var(--set-text); }
.et-lens-stat { cursor: default; }

.et-powers { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--set-border); }
.et-powers > svg { color: var(--set-text-dim); }
.et-powers-lab { font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--set-text-dim); }
.et-mod { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; cursor: pointer; font: inherit;
  font-size: 11.5px; font-weight: 600; color: var(--set-text-secondary); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); }
.et-mod:hover { color: var(--set-deep); border-color: color-mix(in srgb, var(--set-deep) 36%, transparent); transform: translateY(-1px); }
.et-mod :deep(svg) { color: var(--set-deep); }
.et-mod.alt { color: var(--set-text-muted); }
.et-mod.alt :deep(svg) { color: var(--set-text-muted); }

.et-hero { display: grid; grid-template-columns: 1.55fr 1fr; gap: 16px; align-items: start; }
@media (max-width: 940px) { .et-hero { grid-template-columns: 1fr; } }
.et-orbit-wrap { min-width: 0; }
.et-orbit-skel { position: relative; overflow: hidden; width: 100%; min-height: 300px; border-radius: 18px; background: var(--set-surface); border: 1px solid var(--set-border); }
.et-orbit-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; width: 100%; min-height: 300px;
  border-radius: 18px; background: var(--set-surface); border: 1px dashed var(--set-border-strong); color: var(--set-text-dim); text-align: center; padding: 20px; }
.et-orbit-empty :deep(svg) { color: var(--set-deep); }
.et-orbit-empty p { margin: 0; font-size: 12.5px; max-width: 26ch; }

.et-insight { display: flex; flex-direction: column; gap: 9px; padding: 16px; border-radius: 18px; background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow); }
.et-insight-head { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-deep); margin-bottom: 4px; }
.et-insight-head :deep(svg) { color: var(--set-deep); }
.et-insight-row { display: flex; align-items: center; gap: 11px; padding: 10px 11px; border-radius: 12px; background: var(--set-panel); border: 1px solid var(--set-border);
  animation: set-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.07s + 0.15s); }
.et-insight-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; }
.et-insight-ic[data-tone="gold"] { color: var(--set-gold); background: color-mix(in srgb, var(--set-gold) 14%, transparent); }
.et-insight-ic[data-tone="warn"] { color: var(--set-partial); background: var(--set-partial-soft); }
.et-insight-ic[data-tone="ok"] { color: var(--set-ok); background: var(--set-ok-soft); }
.et-insight-body { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.25; }
.et-insight-body b { font-size: 14px; font-weight: 850; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.et-insight-body span { font-size: 10.5px; color: var(--set-text-muted); }
.et-insight-go { width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0; display: grid; place-items: center; cursor: pointer;
  color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s; }
.et-insight-go:hover { color: var(--set-deep); border-color: color-mix(in srgb, var(--set-deep) 36%, transparent); transform: translateX(2px); }

.et-bar { display: flex; align-items: center; gap: 12px; }
.et-search { flex: 1; min-width: 200px; display: flex; align-items: center; gap: 8px; padding: 9px 13px; border-radius: 11px; background: var(--set-surface); border: 1px solid var(--set-border); color: var(--set-text-dim); }
.et-search:focus-within { border-color: var(--set-border-warm); }
.et-search input { flex: 1; min-width: 0; border: none; background: none; outline: none; font: inherit; font-size: 13px; color: var(--set-text); }
.et-count { font-size: 11px; color: var(--set-text-dim); }

.et-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
@media (max-width: 480px) { .et-grid { grid-template-columns: 1fr; } }
.et-card-skel { position: relative; overflow: hidden; height: 168px; border-radius: 16px; background: var(--set-surface); border: 1px solid var(--set-border);
  animation: set-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.06s); }
.et-skel-beam { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(234,88,12,0.08) 50%, transparent 70%); background-size: 220% 100%; animation: set-sheen 1.5s ease infinite; }

@media (prefers-reduced-motion: reduce) {
  .et-insight-row, .et-card-skel, .et-skel-beam { animation: none; }
}
</style>
