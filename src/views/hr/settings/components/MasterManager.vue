<template>
  <div class="mm">
    <SetSectionHead :eyebrow="domain.eyebrow" :title="domain.label" accent="· Registry"
      :accent-color="domain.accent" :sub="domain.blurb" :icon="domain.icon">
      <template #actions>
        <button class="set-btn set-btn-steel" :disabled="loading" @click="reload" title="Refresh">
          <RefreshCw :size="14" :class="{ 'set-spin': loading }" />
        </button>
        <Motion v-if="domain.mode !== 'enum'" as="button" type="button" class="set-btn set-btn-primary"
          :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="openCreate">
          <Plus :size="14" /> New {{ domain.noun }}
        </Motion>
      </template>

      <template #lenses>
        <div class="mm-lenses">
          <button class="set-chip" :class="{ on: lens === 'all' }" :style="{ '--acc': domain.accent }" @click="lens = 'all'">
            <Layers :size="12" /> All <b>{{ rows.length }}</b>
          </button>
          <template v-if="domain.hasActive">
            <button class="set-chip" :class="{ on: lens === 'active' }" style="--acc: var(--set-ok)" @click="lens = lens === 'active' ? 'all' : 'active'">
              Active <b>{{ activeCount }}</b>
            </button>
            <button class="set-chip" :class="{ on: lens === 'inactive' }" style="--acc: var(--set-unset)" @click="lens = lens === 'inactive' ? 'all' : 'inactive'">
              Inactive <b>{{ rows.length - activeCount }}</b>
            </button>
          </template>
          <span class="mm-lens-info set-chip" v-if="domain.mode === 'enum'"><Lock :size="12" /> Built-in</span>
        </div>
      </template>

      <!-- powers + cross-links -->
      <div v-if="moduleChips.length" class="mm-powers">
        <Share2 :size="12" /><span class="mm-powers-lab">Powers</span>
        <button v-for="m in moduleChips" :key="m.slug" class="mm-mod" :style="{ '--acc': domain.accent }" @click="goModule(m.to)">
          <component :is="m.icon" :size="12" /> {{ m.label }}
        </button>
        <button v-if="domain.crossNote" class="mm-mod alt" @click="goModule(domain.crossNote.to)">
          <ExternalLink :size="12" /> {{ domain.crossNote.label }}
        </button>
      </div>
    </SetSectionHead>

    <!-- filter strip -->
    <div class="mm-bar">
      <div class="mm-search">
        <Search :size="14" />
        <input v-model="q" :placeholder="`Search ${domain.nounPlural}…`" />
      </div>
      <span class="mm-count set-mono">{{ visible.length }} / {{ rows.length }}</span>
    </div>

    <!-- loading -->
    <div v-if="loading" class="mm-grid">
      <div v-for="n in 6" :key="n" class="mm-skel" :style="{ '--i': n }"><span class="mm-skel-beam" /></div>
    </div>

    <!-- empty -->
    <SetEmptyState v-else-if="!visible.length" :icon="domain.icon" :accent-color="domain.accent"
      :title="hasFilter ? `No ${domain.nounPlural} match` : domain.emptyTitle"
      :sub="hasFilter ? 'Try a different search or filter.' : domain.emptySub">
      <button v-if="hasFilter" class="set-btn set-btn-ghost" @click="clearFilters"><FilterX :size="14" /> Clear</button>
      <button v-else-if="domain.mode !== 'enum'" class="set-btn set-btn-primary" @click="openCreate"><Plus :size="14" /> New {{ domain.noun }}</button>
    </SetEmptyState>

    <!-- cards -->
    <div v-else class="mm-grid">
      <MasterCard v-for="(r, i) in visible" :key="rowKey(r)" :view="rowView(r)" :icon="domain.icon"
        :accent="domain.accent" :index="i" :active="domain.hasActive ? !!r.is_active : null" :system="!!r.is_system"
        @edit="openEdit(r)" @delete="openDelete(r)" @toggle="toggleActive(r)" />
    </div>

    <MasterUpsertModal :open="formOpen" :domain="domain" :edit-target="editTarget" :ref-data="refData" :saving="saving"
      :lock-code="!!editTarget?.is_system" @close="formOpen = false" @save="save" />
    <MasterDeleteModal :open="delOpen" :loading="deleting" :domain="domain" :target="delTarget"
      @close="delOpen = false" @confirm="doDelete" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'
import { Plus, RefreshCw, Search, FilterX, Layers, Lock, Share2, ExternalLink } from 'lucide-vue-next'
import SetSectionHead from './SetSectionHead.vue'
import SetEmptyState from './SetEmptyState.vue'
import MasterCard from './MasterCard.vue'
import MasterUpsertModal from './MasterUpsertModal.vue'
import MasterDeleteModal from './MasterDeleteModal.vue'
import { MODULES } from './connectivity'
import { listMaster, createMaster, updateMaster, deleteMaster, errText, titleCase } from '../composables/useHrSettings'
import { syncReferenceSlice } from '@/composables/useEmployees'

const props = defineProps({ domain: { type: Object, required: true } })
const emit = defineEmits(['refresh-stats'])
const toast = useToast()
const router = useRouter()

const rows = ref([])
const loading = ref(false)
const q = ref('')
const lens = ref('all')
const refData = ref({ self: [], grades: [], departments: [] })

const needsGrades = computed(() => props.domain.fields?.some(f => f.optionsFrom === 'grades'))
const needsDepts = computed(() => props.domain.fields?.some(f => f.optionsFrom === 'departments'))

async function reload() {
  if (props.domain.mode === 'enum') {
    rows.value = (props.domain.enumData || []).map(e => ({ id: e.code, name: e.label, code: e.code }))
    return
  }
  loading.value = true
  try {
    const [list, grades, depts] = await Promise.all([
      listMaster(props.domain.base),
      needsGrades.value ? listMaster('grades').catch(() => []) : Promise.resolve([]),
      needsDepts.value ? listMaster('departments').catch(() => []) : Promise.resolve([]),
    ])
    rows.value = list
    refData.value = { self: list, grades, departments: depts }
    // Keep the shared HR reference cache (useHrReference) in lockstep so edits
    // here show up live in employee/recruitment/training dropdowns without a
    // page reload. No-op for non-reference domains (asset-categories, etc).
    syncReferenceSlice(props.domain.base, list)
    emit('refresh-stats')
  } catch (e) { toast.error(errText(e, `Failed to load ${props.domain.nounPlural}`)) }
  finally { loading.value = false }
}
onMounted(reload)

const activeCount = computed(() => rows.value.filter(r => r.is_active).length)
const hasFilter = computed(() => !!q.value || lens.value !== 'all')
const visible = computed(() => {
  const term = q.value.trim().toLowerCase()
  const keys = props.domain.searchKeys || ['name', 'code']
  return rows.value.filter(r => {
    if (props.domain.hasActive) {
      if (lens.value === 'active' && !r.is_active) return false
      if (lens.value === 'inactive' && r.is_active) return false
    }
    if (term && !keys.some(k => String(r[k] || '').toLowerCase().includes(term))) return false
    return true
  })
})
const clearFilters = () => { q.value = ''; lens.value = 'all' }
const rowKey = (r) => r.id || r.code

// ── cross-links ──
const moduleChips = computed(() => (props.domain.governs || []).map(s => ({ slug: s, ...MODULES[s] })).filter(m => m.label))
const goModule = (to) => { if (to) router.push(to) }

// ── per-row display ──
const nameById = computed(() => Object.fromEntries(refData.value.self.map(r => [r.id, r.name])))
const gradeById = computed(() => Object.fromEntries((refData.value.grades || []).map(r => [r.id, r.name])))
const deptById = computed(() => Object.fromEntries((refData.value.departments || []).map(r => [r.id, r.name])))

function rowView(r) {
  const d = props.domain.slug
  if (d === 'departments') return { title: r.name, code: r.code, sub: r.parent_department_id ? `Under ${nameById.value[r.parent_department_id] || 'parent'}` : 'Top-level department', tags: [] }
  if (d === 'designations') {
    const tags = []
    if (r.level != null) tags.push(`Level ${r.level}`)
    return { title: r.name, code: r.code, sub: r.grade_id ? `Grade · ${gradeById.value[r.grade_id] || '—'}` : (r.department_id ? deptById.value[r.department_id] : 'Job title'), tags }
  }
  if (d === 'grades') {
    const tags = []
    if (r.default_pay_level) tags.push(`Pay ${r.default_pay_level}`)
    if (r.min_ctc || r.max_ctc) tags.push(`₹${fmtK(r.min_ctc)}–${fmtK(r.max_ctc)}`)
    if (r.level != null) tags.push(`L${r.level}`)
    return { title: r.name, code: r.code, sub: r.band || 'Pay band', tags }
  }
  if (d === 'work-locations') {
    return { title: r.name, code: r.type || 'HQ', sub: [r.city, r.state, r.country].filter(Boolean).join(', ') || 'Work location', tags: r.type ? [titleCase(r.type)] : [] }
  }
  if (d === 'asset-categories') {
    const tags = []
    if (r.useful_life_months) tags.push(`${r.useful_life_months}mo life`)
    return { title: r.name, code: r.code, sub: r.description || 'Asset class', tags }
  }
  if (d === 'employment-types' || d === 'employee-categories') {
    return { title: r.label, code: r.code,
      sub: r.description || (d === 'employment-types' ? 'Engagement model' : 'Classification'),
      tags: r.is_system ? ['Built-in'] : [] }
  }
  if (d === 'separation-reasons') {
    const tags = [r.category === 'RESIGNATION_TYPE' ? 'Resignation' : 'Exit reason']
    if (r.is_voluntary === true) tags.push('Voluntary')
    else if (r.is_voluntary === false) tags.push('Involuntary')
    return { title: r.label, code: r.code, sub: r.description || '—', tags }
  }
  return { title: r.name || r.label, code: r.code, sub: 'Value', tags: [] }
}
const fmtK = (v) => { const n = Number(v || 0); return n >= 100000 ? `${(n / 100000).toFixed(1)}L` : n >= 1000 ? `${Math.round(n / 1000)}k` : n }

// ── CRUD ──
const formOpen = ref(false)
const editTarget = ref(null)
const saving = ref(false)
const openCreate = () => { editTarget.value = null; formOpen.value = true }
const openEdit = (r) => { editTarget.value = r; formOpen.value = true }

function buildPayload(form) {
  const out = {}
  for (const f of props.domain.fields) {
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
    if (editTarget.value) await updateMaster(props.domain.base, editTarget.value.id, payload)
    else await createMaster(props.domain.base, payload)
    toast.success(editTarget.value ? `${titleCase(props.domain.noun)} updated` : `${titleCase(props.domain.noun)} created`)
    formOpen.value = false
    await reload()
  } catch (e) { toast.error(errText(e, 'Failed to save')) }
  finally { saving.value = false }
}

async function toggleActive(r) {
  if (!props.domain.hasActive) return
  const next = !r.is_active
  r.is_active = next
  try { await updateMaster(props.domain.base, r.id, { is_active: next }); emit('refresh-stats') }
  catch (e) { r.is_active = !next; toast.error(errText(e, 'Failed to update')) }
}

const delOpen = ref(false)
const delTarget = ref(null)
const deleting = ref(false)
const openDelete = (r) => { delTarget.value = r; delOpen.value = true }
async function doDelete() {
  deleting.value = true
  try {
    await deleteMaster(props.domain.base, delTarget.value.id)
    toast.success(`${titleCase(props.domain.noun)} deleted`)
    delOpen.value = false
    await reload()
  } catch (e) { toast.error(errText(e, 'Reassign referencing records first')) }
  finally { deleting.value = false }
}

defineExpose({ reload })
</script>

<style scoped>
.mm { display: flex; flex-direction: column; gap: 16px; }
.mm-lenses { display: flex; flex-wrap: wrap; gap: 8px; }
.mm-lenses .set-chip b { color: var(--set-text); }
.mm-lens-info { cursor: default; }

.mm-powers { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--set-border); }
.mm-powers :deep(svg.lucide-share-2), .mm-powers > svg { color: var(--set-text-dim); }
.mm-powers-lab { font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--set-text-dim); }
.mm-mod { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; cursor: pointer; font: inherit;
  font-size: 11.5px; font-weight: 600; color: var(--set-text-secondary); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); }
.mm-mod:hover { color: var(--acc); border-color: color-mix(in srgb, var(--acc) 36%, transparent); transform: translateY(-1px); }
.mm-mod :deep(svg) { color: var(--acc); }
.mm-mod.alt { color: var(--set-text-muted); }
.mm-mod.alt :deep(svg) { color: var(--set-text-muted); }

.mm-bar { display: flex; align-items: center; gap: 12px; }
.mm-search { flex: 1; min-width: 200px; display: flex; align-items: center; gap: 8px; padding: 9px 13px; border-radius: 11px;
  background: var(--set-surface); border: 1px solid var(--set-border); color: var(--set-text-dim); }
.mm-search:focus-within { border-color: var(--set-border-warm); }
.mm-search input { flex: 1; min-width: 0; border: none; background: none; outline: none; font: inherit; font-size: 13px; color: var(--set-text); }
.mm-count { font-size: 11px; color: var(--set-text-dim); }

.mm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(268px, 1fr)); gap: 13px; }
@media (max-width: 480px) { .mm-grid { grid-template-columns: 1fr; } }
.mm-skel { position: relative; overflow: hidden; height: 150px; border-radius: 16px; background: var(--set-surface); border: 1px solid var(--set-border);
  animation: set-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.06s); }
.mm-skel-beam { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(251,191,36,0.08) 50%, transparent 70%);
  background-size: 220% 100%; animation: set-sheen 1.5s ease infinite; }

@media (prefers-reduced-motion: reduce) { .mm-skel, .mm-skel-beam { animation: none; } }
</style>
