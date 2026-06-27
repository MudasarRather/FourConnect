<template>
  <div class="gp">
    <SetSectionHead eyebrow="Organization · Bands" title="Compensation" accent="Ladder"
      accent-color="var(--set-gold)" :icon="Layers"
      sub="Pay grades define salary bands, hierarchy levels and default pay levels. CTC bands are enforced on employee compensation, and travel class, per-diem (DA) and advance limits resolve per grade. (Pay-structure selection is set per employee, not by grade.)">
      <template #actions>
        <button class="set-btn set-btn-steel" :disabled="loading" @click="reload" title="Refresh">
          <RefreshCw :size="14" :class="{ 'set-spin': loading }" />
        </button>
        <Motion as="button" type="button" class="set-btn set-btn-primary" :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="openCreate">
          <Plus :size="14" /> New grade
        </Motion>
      </template>

      <template #lenses>
        <div class="gp-lenses">
          <button class="set-chip" :class="{ on: lens === 'all' }" style="--acc: var(--set-gold)" @click="lens = 'all'">
            <Layers :size="12" /> All <b>{{ rows.length }}</b>
          </button>
          <button class="set-chip" :class="{ on: lens === 'banded' }" style="--acc: var(--set-gold)" @click="lens = lens === 'banded' ? 'all' : 'banded'">
            Banded <b>{{ bandedCount }}</b>
          </button>
          <button class="set-chip" :class="{ on: lens === 'paylevel' }" style="--acc: var(--set-ok)" @click="lens = lens === 'paylevel' ? 'all' : 'paylevel'">
            <Gauge :size="12" /> Pay level <b>{{ payLevelCount }}</b>
          </button>
          <button class="set-chip" :class="{ on: lens === 'overlap' }" style="--acc: var(--set-orange)" @click="lens = lens === 'overlap' ? 'all' : 'overlap'">
            <AlertTriangle :size="12" /> Overlaps <b>{{ overlapIds.size }}</b>
          </button>
          <span class="set-chip gp-lens-stat"><Users :size="12" /> {{ orgHeadcount }} people</span>
        </div>
      </template>

      <div class="gp-powers">
        <Share2 :size="12" /><span class="gp-powers-lab">Powers</span>
        <button v-for="m in powerLinks" :key="m.label" class="gp-mod" @click="$router.push(m.to)">
          <component :is="m.icon" :size="12" /> {{ m.label }}
        </button>
        <button class="gp-mod alt" @click="$router.push('/admin/hr/settings/designations')">
          <ExternalLink :size="12" /> Designations map here
        </button>
        <button class="gp-mod alt" @click="$router.push('/admin/hr/payroll/compensation')">
          <ExternalLink :size="12" /> Compensation
        </button>
      </div>
    </SetSectionHead>

    <!-- signature instrument + insights -->
    <div class="gp-hero">
      <Motion as="div" class="gp-spec-wrap"
        :initial="{ opacity: 0, scale: 0.98 }" :animate="{ opacity: 1, scale: 1 }" :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
        <div v-if="loading" class="gp-spec-skel"><span class="gp-skel-beam" /></div>
        <GradeSpectrum v-else :grades="rows" :headcount-by-id="headcountById" @select="openEdit" />
      </Motion>

      <Motion as="aside" class="gp-insight"
        :initial="{ opacity: 0, x: 16 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }">
        <header class="gp-insight-head"><Activity :size="14" /> Band intelligence</header>
        <div class="gp-insight-row" v-for="(ins, i) in insights" :key="ins.key" :style="{ '--i': i }">
          <span class="gp-insight-ic" :data-tone="ins.tone"><component :is="ins.icon" :size="14" /></span>
          <div class="gp-insight-body">
            <b>{{ ins.value }}</b>
            <span>{{ ins.label }}</span>
          </div>
          <button v-if="ins.action" class="gp-insight-go" @click="ins.action()"><ArrowRight :size="12" /></button>
        </div>
      </Motion>
    </div>

    <!-- filter bar -->
    <div class="gp-bar">
      <div class="gp-search">
        <Search :size="14" />
        <input v-model="q" placeholder="Search grades, codes, bands, pay levels…" />
      </div>
      <span class="gp-count set-mono">{{ visible.length }} / {{ rows.length }}</span>
    </div>

    <!-- cards -->
    <div v-if="loading" class="gp-grid">
      <div v-for="n in 6" :key="n" class="gp-card-skel" :style="{ '--i': n }"><span class="gp-skel-beam" /></div>
    </div>
    <SetEmptyState v-else-if="!visible.length" :icon="Layers" accent-color="var(--set-gold)"
      :title="hasFilter ? 'No grades match' : 'No grades yet'"
      :sub="hasFilter ? 'Try a different search or filter.' : 'Grades define salary ranges and unlock travel, DA and hotel eligibility across the org.'">
      <button v-if="hasFilter" class="set-btn set-btn-ghost" @click="clearFilters"><FilterX :size="14" /> Clear</button>
      <button v-else class="set-btn set-btn-primary" @click="openCreate"><Plus :size="14" /> New grade</button>
    </SetEmptyState>
    <div v-else class="gp-grid">
      <GradeCard v-for="(g, i) in visible" :key="g.id" :grade="g" :index="i"
        :headcount="hcOf(g.id)" :designation-count="desigCountOf(g.id)" :overlap="overlapIds.has(g.id)"
        :lo-text="loTextOf(g)" :hi-text="hiTextOf(g)" :left-pct="leftPctOf(g)" :width-pct="widthPctOf(g)"
        @edit="openEdit" @delete="openDelete" @view="viewPeople" />
    </div>

    <MasterUpsertModal :open="formOpen" :domain="domain" :edit-target="editTarget" :ref-data="{}" :saving="saving"
      @close="formOpen = false" @save="save" />
    <GradeDeleteModal :open="delOpen" :loading="deleting" :target="delTarget"
      :headcount="delTarget ? hcOf(delTarget.id) : 0" :designation-count="delTarget ? desigCountOf(delTarget.id) : 0"
      @close="delOpen = false" @confirm="doDelete" @view-people="viewPeople" @view-designations="viewDesignations" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'
import axios from 'axios'
import {
  Layers, RefreshCw, Plus, Gauge, AlertTriangle, Users, Share2, ExternalLink, Search, FilterX,
  Activity, ArrowRight, IndianRupee, BadgeCheck, TriangleAlert,
} from 'lucide-vue-next'
import { API, authHeader } from '@/utils/api'
import SetSectionHead from '../components/SetSectionHead.vue'
import SetEmptyState from '../components/SetEmptyState.vue'
import GradeSpectrum from '../components/GradeSpectrum.vue'
import GradeCard from '../components/GradeCard.vue'
import MasterUpsertModal from '../components/MasterUpsertModal.vue'
import GradeDeleteModal from '../components/GradeDeleteModal.vue'
import { MASTER_DOMAINS } from '../components/masterDomains'
import { MODULES } from '../components/connectivity'
import { listMaster, createMaster, updateMaster, deleteMaster, errText } from '../composables/useHrSettings'
import { syncReferenceSlice } from '@/composables/useEmployees'

const toast = useToast()
const router = useRouter()
const domain = MASTER_DOMAINS['grades']

const rows = ref([])
const designations = ref([])
const headcountById = ref({})
const orgHeadcount = ref(0)
const loading = ref(false)
const q = ref('')
const lens = ref('all')

const h = () => ({ headers: authHeader() })
const numv = (v) => (v == null || v === '' ? null : Number(v))

async function gradeCount(id) {
  try {
    const res = await axios.get(`${API}/hr/employees/`, { ...h(), params: { grade_id: id, page: 1, limit: 1 } })
    return Number(res.data?.total || 0)
  } catch { return 0 }
}

async function reload() {
  loading.value = true
  try {
    const [grades, desigs] = await Promise.all([
      listMaster('grades'),
      listMaster('designations').catch(() => []),
    ])
    rows.value = grades
    designations.value = desigs
    syncReferenceSlice('grades', grades)
    const counts = await Promise.all(grades.map(g => gradeCount(g.id)))
    const map = {}
    grades.forEach((g, i) => { map[g.id] = counts[i] })
    headcountById.value = map
    orgHeadcount.value = Object.values(map).reduce((a, b) => a + b, 0)
  } catch (e) {
    toast.error(errText(e, 'Failed to load grades'))
  } finally { loading.value = false }
}
onMounted(reload)

// ── derived ──
const hcOf = (id) => Number(headcountById.value[id] || 0)
const desigCountOf = (id) => designations.value.filter(d => String(d.grade_id) === String(id)).length
const bandedCount = computed(() => rows.value.filter(g => numv(g.min_ctc) != null || numv(g.max_ctc) != null).length)
const payLevelCount = computed(() => rows.value.filter(g => !!g.default_pay_level).length)

// range helpers (shared axis across banded grades)
const bandOf = (g) => {
  const a = numv(g.min_ctc), b = numv(g.max_ctc)
  if (a == null && b == null) return null
  let lo = a ?? b, hi = b ?? a
  if (hi < lo) [lo, hi] = [hi, lo]
  return { lo, hi }
}
const axis = computed(() => {
  const bands = rows.value.map(bandOf).filter(Boolean)
  if (!bands.length) return { min: 0, max: 1 }
  let min = Math.min(...bands.map(b => b.lo)), max = Math.max(...bands.map(b => b.hi))
  if (max === min) max = min + 1
  const pad = (max - min) * 0.06
  return { min: Math.max(0, min - pad), max: max + pad }
})
const pctOf = (v) => {
  const { min, max } = axis.value
  return Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100))
}
const leftPctOf = (g) => { const b = bandOf(g); return b ? pctOf(b.lo) : 0 }
const widthPctOf = (g) => { const b = bandOf(g); return b ? Math.max(3, pctOf(b.hi) - pctOf(b.lo)) : 0 }
const loTextOf = (g) => { const b = bandOf(g); return b ? fmtShort(b.lo) : '' }
const hiTextOf = (g) => { const b = bandOf(g); return b ? fmtShort(b.hi) : '' }

const overlapIds = computed(() => {
  const out = new Set()
  const arr = rows.value.map(g => ({ id: g.id, b: bandOf(g) })).filter(x => x.b)
  for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) {
    if (arr[i].b.lo < arr[j].b.hi && arr[j].b.lo < arr[i].b.hi) { out.add(arr[i].id); out.add(arr[j].id) }
  }
  return out
})

function fmtShort(n) {
  const v = Number(n) || 0
  if (v >= 1e7) return (v / 1e7).toFixed(v % 1e7 ? 1 : 0) + 'cr'
  if (v >= 1e5) return (v / 1e5).toFixed(v % 1e5 ? 1 : 0) + 'L'
  if (v >= 1e3) return Math.round(v / 1e3) + 'k'
  return String(Math.round(v))
}

const hasFilter = computed(() => !!q.value || lens.value !== 'all')
const visible = computed(() => {
  const term = q.value.trim().toLowerCase()
  return rows.value.filter(g => {
    if (lens.value === 'banded' && numv(g.min_ctc) == null && numv(g.max_ctc) == null) return false
    if (lens.value === 'paylevel' && !g.default_pay_level) return false
    if (lens.value === 'overlap' && !overlapIds.value.has(g.id)) return false
    if (term && ![g.name, g.code, g.band, g.default_pay_level].some(v => String(v || '').toLowerCase().includes(term))) return false
    return true
  }).sort((a, b) => (b.level ?? -1) - (a.level ?? -1))
})
const clearFilters = () => { q.value = ''; lens.value = 'all' }

const powerLinks = ['payroll', 'travel'].map(s => ({ ...MODULES[s] })).filter(m => m.label)

const insights = computed(() => {
  const out = []
  const banded = rows.value.map(g => ({ g, b: bandOf(g) })).filter(x => x.b)
  const top = [...banded].sort((a, b) => b.b.hi - a.b.hi)[0]
  if (top) out.push({ key: 'top', icon: IndianRupee, tone: 'gold', value: `${top.g.code} · ₹${fmtShort(top.b.hi)}`, label: 'Highest ceiling on the ladder', action: () => openEdit(top.g) })
  const noBand = rows.value.filter(g => numv(g.min_ctc) == null && numv(g.max_ctc) == null).length
  out.push({ key: 'noband', icon: BadgeCheck, tone: noBand ? 'warn' : 'ok', value: noBand, label: noBand ? 'grades without a CTC band' : 'all grades carry a CTC band', action: noBand ? () => { lens.value = 'banded' } : null })
  const noPay = rows.value.filter(g => !g.default_pay_level).length
  out.push({ key: 'nopay', icon: Gauge, tone: noPay ? 'warn' : 'ok', value: noPay, label: noPay ? 'grades have no default pay level' : 'every grade sets a pay level', action: noPay ? () => { lens.value = 'paylevel' } : null })
  out.push({ key: 'overlap', icon: TriangleAlert, tone: overlapIds.value.size ? 'warn' : 'ok', value: overlapIds.value.size, label: overlapIds.value.size ? 'grades sit in overlapping bands' : 'no overlapping pay bands', action: overlapIds.value.size ? () => { lens.value = 'overlap' } : null })
  return out
})

// ── CRUD ──
const formOpen = ref(false)
const editTarget = ref(null)
const saving = ref(false)
const openCreate = () => { editTarget.value = null; formOpen.value = true }
const openEdit = (g) => { editTarget.value = g; formOpen.value = true }

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
    if (editTarget.value) await updateMaster('grades', editTarget.value.id, payload)
    else await createMaster('grades', payload)
    toast.success(editTarget.value ? 'Grade updated' : 'Grade created')
    formOpen.value = false
    await reload()
  } catch (e) { toast.error(errText(e, 'Failed to save grade')) }
  finally { saving.value = false }
}

const delOpen = ref(false)
const delTarget = ref(null)
const deleting = ref(false)
const openDelete = (g) => { delTarget.value = g; delOpen.value = true }
async function doDelete() {
  deleting.value = true
  try {
    await deleteMaster('grades', delTarget.value.id)
    toast.success('Grade deleted')
    delOpen.value = false
    await reload()
  } catch (e) { toast.error(errText(e, 'Failed to delete grade')) }
  finally { deleting.value = false }
}

// ── connectivity ──
const viewPeople = (g) => router.push({ path: '/admin/hr/employees/all', query: { grade_id: g.id } })
const viewDesignations = () => router.push('/admin/hr/settings/designations')
</script>

<style scoped>
.gp { display: flex; flex-direction: column; gap: 16px; }
.gp-lenses { display: flex; flex-wrap: wrap; gap: 8px; }
.gp-lenses .set-chip b { color: var(--set-text); }
.gp-lens-stat { cursor: default; }

.gp-powers { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--set-border); }
.gp-powers > svg { color: var(--set-text-dim); }
.gp-powers-lab { font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--set-text-dim); }
.gp-mod { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; cursor: pointer; font: inherit;
  font-size: 11.5px; font-weight: 600; color: var(--set-text-secondary); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); }
.gp-mod:hover { color: var(--set-gold); border-color: color-mix(in srgb, var(--set-gold) 36%, transparent); transform: translateY(-1px); }
.gp-mod :deep(svg) { color: var(--set-gold); }
.gp-mod.alt { color: var(--set-text-muted); }
.gp-mod.alt :deep(svg) { color: var(--set-text-muted); }

.gp-hero { display: grid; grid-template-columns: 1.55fr 1fr; gap: 16px; align-items: stretch; }
@media (max-width: 940px) { .gp-hero { grid-template-columns: 1fr; } }
.gp-spec-wrap { min-width: 0; }
.gp-spec-skel { position: relative; overflow: hidden; width: 100%; min-height: 280px; border-radius: 18px; background: var(--set-surface); border: 1px solid var(--set-border); }

.gp-insight { display: flex; flex-direction: column; gap: 9px; padding: 16px; border-radius: 18px; background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow); }
.gp-insight-head { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-gold); margin-bottom: 4px; }
.gp-insight-head :deep(svg) { color: var(--set-gold); }
.gp-insight-row { display: flex; align-items: center; gap: 11px; padding: 10px 11px; border-radius: 12px; background: var(--set-panel); border: 1px solid var(--set-border);
  animation: set-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.07s + 0.15s); }
.gp-insight-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; }
.gp-insight-ic[data-tone="gold"] { color: var(--set-gold); background: color-mix(in srgb, var(--set-gold) 14%, transparent); }
.gp-insight-ic[data-tone="warn"] { color: var(--set-partial); background: var(--set-partial-soft); }
.gp-insight-ic[data-tone="ok"] { color: var(--set-ok); background: var(--set-ok-soft); }
.gp-insight-body { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.25; }
.gp-insight-body b { font-size: 14px; font-weight: 850; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.gp-insight-body span { font-size: 10.5px; color: var(--set-text-muted); }
.gp-insight-go { width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0; display: grid; place-items: center; cursor: pointer;
  color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s; }
.gp-insight-go:hover { color: var(--set-gold); border-color: color-mix(in srgb, var(--set-gold) 36%, transparent); transform: translateX(2px); }

.gp-bar { display: flex; align-items: center; gap: 12px; }
.gp-search { flex: 1; min-width: 200px; display: flex; align-items: center; gap: 8px; padding: 9px 13px; border-radius: 11px; background: var(--set-surface); border: 1px solid var(--set-border); color: var(--set-text-dim); }
.gp-search:focus-within { border-color: var(--set-border-warm); }
.gp-search input { flex: 1; min-width: 0; border: none; background: none; outline: none; font: inherit; font-size: 13px; color: var(--set-text); }
.gp-count { font-size: 11px; color: var(--set-text-dim); }

.gp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 14px; }
@media (max-width: 480px) { .gp-grid { grid-template-columns: 1fr; } }
.gp-card-skel { position: relative; overflow: hidden; height: 240px; border-radius: 18px; background: var(--set-surface); border: 1px solid var(--set-border);
  animation: set-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.06s); }
.gp-skel-beam { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(251,191,36,0.08) 50%, transparent 70%); background-size: 220% 100%; animation: set-sheen 1.5s ease infinite; }

@media (prefers-reduced-motion: reduce) {
  .gp-insight-row, .gp-card-skel { animation: none; }
  .gp-skel-beam { animation: none; }
}
</style>
