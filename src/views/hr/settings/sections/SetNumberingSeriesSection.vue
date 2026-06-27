<template>
  <div class="nf">
    <SetSectionHead eyebrow="Pay & Statutory · Sequences" title="Numbering" accent="Series"
      accent-color="var(--set-ember)" :icon="Hash"
      sub="Design auto-generated identifiers — prefix, year/month tokens, counter width and reset policy. A series is opt-in: until you configure one, the built-in auto-ID keeps running unchanged.">
      <template #actions>
        <button class="set-btn set-btn-steel" :disabled="loading" @click="reload" title="Refresh">
          <RefreshCw :size="14" :class="{ 'set-spin': loading }" />
        </button>
      </template>

      <template #lenses>
        <div class="nf-lenses">
          <button class="set-chip" :class="{ on: lens === 'all' }" style="--acc: var(--set-ember)" @click="lens = 'all'">
            <Layers :size="12" /> All <b>{{ catalog.length }}</b>
          </button>
          <button class="set-chip" :class="{ on: lens === 'configured' }" style="--acc: var(--set-ember)" @click="setLens('configured')">
            <Stamp :size="12" /> Configured <b>{{ counts.configured }}</b>
          </button>
          <button class="set-chip" :class="{ on: lens === 'active' }" style="--acc: var(--set-ok)" @click="setLens('active')">
            <Power :size="12" /> Active <b>{{ counts.active }}</b>
          </button>
          <button class="set-chip" :class="{ on: lens === 'fyreset' }" style="--acc: var(--set-gold)" @click="setLens('fyreset')">
            <RotateCcw :size="12" /> FY-reset <b>{{ counts.fyreset }}</b>
          </button>
          <button class="set-chip" :class="{ on: lens === 'builtin' }" style="--acc: var(--set-unset)" @click="setLens('builtin')">
            <Hash :size="12" /> Built-in <b>{{ counts.builtin }}</b>
          </button>
        </div>
      </template>

      <div class="nf-powers">
        <Share2 :size="12" /><span class="nf-powers-lab">Powers</span>
        <button class="nf-mod" @click="$router.push('/admin/hr/employees/all')"><Users :size="12" /> Employees</button>
        <button class="nf-mod" @click="$router.push('/admin/hr/recruitment/dashboard')"><UserPlus :size="12" /> Recruitment</button>
        <button class="nf-mod alt" @click="$router.push('/admin/hr/settings/audit-logs')"><History :size="12" /> Audit trail</button>
      </div>
    </SetSectionHead>

    <!-- signature instrument: the Sequence Foundry -->
    <MintPress :series="series" :catalog="catalog" :loading="loading" />

    <!-- grouped mint plates -->
    <template v-if="loading">
      <div class="nf-grid">
        <div v-for="n in 4" :key="n" class="nf-skel" :style="{ '--i': n }"><span class="nf-skel-beam" /></div>
      </div>
    </template>

    <SetEmptyState v-else-if="!visibleGroups.length" :icon="Hash" accent-color="var(--set-ember)"
      title="Nothing matches this lens" sub="Try a different filter — every module either runs a configured series or the built-in auto-ID.">
      <button class="set-btn set-btn-ghost" @click="lens = 'all'"><FilterX :size="14" /> Clear filter</button>
    </SetEmptyState>

    <template v-else>
      <section v-for="g in visibleGroups" :key="g.group" class="nf-group">
        <header class="nf-group-head">
          <component :is="g.icon" :size="14" />
          <b>{{ g.group }}</b>
          <span class="nf-group-count">{{ g.mods.length }}</span>
          <span class="nf-group-rule" />
        </header>
        <div class="nf-grid">
          <NumberingPlateCard v-for="(m, i) in g.mods" :key="m.module" :mod="m" :series="byModule[m.module] || null" :index="i"
            @configure="openCreate" @edit="openEdit" @sync="doSync" @delete="openDelete" @go="goTo" />
        </div>
      </section>
    </template>

    <NumberingSeriesModal :open="formOpen" :edit-target="editTarget" :module-meta="activeMeta" :saving="saving"
      @close="formOpen = false" @save="save" />
    <NumberingDeleteModal :open="delOpen" :loading="deleting" :target="delTarget" :module-meta="delMeta"
      @close="delOpen = false" @confirm="doDelete" @deactivate="doDeactivate" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { Hash, RefreshCw, Layers, Stamp, Power, RotateCcw, Share2, Users, UserPlus, History, FilterX } from 'lucide-vue-next'
import SetSectionHead from '../components/SetSectionHead.vue'
import SetEmptyState from '../components/SetEmptyState.vue'
import MintPress from '../components/MintPress.vue'
import NumberingPlateCard from '../components/NumberingPlateCard.vue'
import NumberingSeriesModal from '../components/NumberingSeriesModal.vue'
import NumberingDeleteModal from '../components/NumberingDeleteModal.vue'
import {
  numberingCatalog, listNumbering, createNumbering, updateNumbering, deleteNumbering, syncNumbering, errText,
} from '../composables/useHrSettings'
import { downstreamOf, GROUP_ORDER } from '../composables/numberingFormat'

const router = useRouter()
const toast = useToast()

const loading = ref(false)
const catalog = ref([])
const series = ref([])
const lens = ref('all')

const byModule = computed(() => Object.fromEntries(series.value.map(s => [s.module, s])))
const counts = computed(() => ({
  configured: series.value.length,
  builtin: Math.max(0, catalog.value.length - series.value.length),
  active: series.value.filter(s => s.is_active).length,
  fyreset: series.value.filter(s => s.financial_year_reset).length,
}))

const setLens = (k) => { lens.value = lens.value === k ? 'all' : k }

function passesLens(m) {
  const s = byModule.value[m.module]
  switch (lens.value) {
    case 'configured': return !!s
    case 'builtin': return !s
    case 'active': return !!s && s.is_active
    case 'fyreset': return !!s && s.financial_year_reset
    default: return true
  }
}

// group catalog modules by their downstream module group, lens-filtered
const visibleGroups = computed(() => {
  const buckets = {}
  for (const m of catalog.value) {
    if (!passesLens(m)) continue
    const d = downstreamOf(m.module)
    const g = d.group || 'Other'
    if (!buckets[g]) buckets[g] = { group: g, icon: d.icon, mods: [] }
    buckets[g].mods.push(m)
  }
  const order = [...GROUP_ORDER, ...Object.keys(buckets).filter(k => !GROUP_ORDER.includes(k))]
  return order.map(k => buckets[k]).filter(Boolean)
})

async function reload() {
  loading.value = true
  try {
    const [cat, list] = await Promise.all([numberingCatalog(), listNumbering()])
    catalog.value = cat.modules || []
    series.value = list || []
  } catch (e) { toast.error(errText(e, 'Failed to load numbering series')) }
  finally { loading.value = false }
}
onMounted(reload)

const goTo = (to) => { if (to) router.push(to) }

// ── create / edit ──
const formOpen = ref(false)
const editTarget = ref(null)
const activeMeta = ref(null)
const saving = ref(false)
const openCreate = (m) => { editTarget.value = null; activeMeta.value = m; formOpen.value = true }
const openEdit = (m) => { editTarget.value = byModule.value[m.module] || null; activeMeta.value = m; formOpen.value = true }

async function save(payload) {
  saving.value = true
  try {
    if (editTarget.value) await updateNumbering(editTarget.value.id, payload)
    else await createNumbering(payload)
    toast.success(editTarget.value ? 'Series updated' : 'Series configured')
    formOpen.value = false
    await reload()
  } catch (e) { toast.error(errText(e, 'Failed to save series')) }
  finally { saving.value = false }
}

async function doSync(s) {
  try { await syncNumbering(s.id); toast.success('Counter synced to the current maximum'); await reload() }
  catch (e) { toast.error(errText(e, 'Sync failed')) }
}

// ── delete / deactivate ──
const delOpen = ref(false)
const delTarget = ref(null)
const deleting = ref(false)
const delMeta = computed(() => catalog.value.find(c => c.module === delTarget.value?.module) || null)
const openDelete = (s) => { delTarget.value = s; delOpen.value = true }

async function doDelete(reason) {
  deleting.value = true
  try {
    await deleteNumbering(delTarget.value.id, reason)
    toast.success('Series decommissioned — reverts to built-in auto-ID')
    delOpen.value = false
    await reload()
  } catch (e) { toast.error(errText(e, 'Failed to decommission')) }
  finally { deleting.value = false }
}
async function doDeactivate(s) {
  deleting.value = true
  try {
    await updateNumbering(s.id, { is_active: false })
    toast.success('Series paused — falls back to built-in auto-ID')
    delOpen.value = false
    await reload()
  } catch (e) { toast.error(errText(e, 'Failed to pause')) }
  finally { deleting.value = false }
}
</script>

<style scoped>
.nf { display: flex; flex-direction: column; gap: 16px; }
.nf-lenses { display: flex; flex-wrap: wrap; gap: 8px; }
.nf-lenses .set-chip b { color: var(--set-text); }

.nf-powers { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--set-border); position: relative; z-index: 1; }
.nf-powers > svg { color: var(--set-text-dim); }
.nf-powers-lab { font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--set-text-dim); }
.nf-mod { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; cursor: pointer; font: inherit;
  font-size: 11.5px; font-weight: 600; color: var(--set-text-secondary); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); }
.nf-mod:hover { color: var(--set-ember); border-color: color-mix(in srgb, var(--set-ember) 40%, transparent); transform: translateY(-1px); }
.nf-mod :deep(svg) { color: var(--set-ember); }
.nf-mod.alt { color: var(--set-text-muted); } .nf-mod.alt :deep(svg) { color: var(--set-text-muted); }

.nf-group { display: flex; flex-direction: column; gap: 12px; }
.nf-group-head { display: flex; align-items: center; gap: 9px; }
.nf-group-head > svg { color: var(--set-ember); }
.nf-group-head b { font-size: 13px; font-weight: 800; letter-spacing: 0.02em; color: var(--set-text); }
.nf-group-count { display: grid; place-items: center; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px; font-size: 10px; font-weight: 800;
  color: var(--set-ember); background: color-mix(in srgb, var(--set-ember) 13%, transparent); border: 1px solid color-mix(in srgb, var(--set-ember) 26%, transparent); }
.nf-group-rule { flex: 1; height: 1px; background: linear-gradient(90deg, var(--set-border), transparent); }

.nf-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 14px; }
@media (max-width: 520px) { .nf-grid { grid-template-columns: 1fr; } }

.nf-skel { position: relative; overflow: hidden; height: 240px; border-radius: 16px; background: var(--set-surface); border: 1px solid var(--set-border);
  animation: set-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.06s); }
.nf-skel-beam { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, color-mix(in srgb, var(--set-ember) 9%, transparent) 50%, transparent 70%);
  background-size: 220% 100%; animation: set-sheen 1.5s ease infinite; }

@media (prefers-reduced-motion: reduce) { .nf-skel, .nf-skel-beam { animation: none; } }
</style>
