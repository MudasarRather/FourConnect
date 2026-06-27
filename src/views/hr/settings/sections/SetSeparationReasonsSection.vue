<template>
  <div class="sr">
    <SetSectionHead eyebrow="Workforce · Exit" title="Separation" accent="Reasons"
      accent-color="var(--set-rust)" :icon="DoorOpen"
      sub="The controlled vocabulary of why people leave — resignation types and exit reasons. Every exit case and exit interview draws from this lexicon. Curate the departures board here; the Exit module reads it live.">
      <template #actions>
        <button class="set-btn set-btn-steel" :disabled="loading" @click="reload" title="Refresh">
          <RefreshCw :size="14" :class="{ 'set-spin': loading }" />
        </button>
        <Motion as="button" type="button" class="set-btn set-btn-primary" :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="openCreate">
          <Plus :size="14" /> New reason
        </Motion>
      </template>

      <template #lenses>
        <div class="sr-lenses">
          <button class="set-chip" :class="{ on: lens === 'all' }" style="--acc: var(--set-rust)" @click="lens = 'all'">
            <Layers :size="12" /> All <b>{{ rows.length }}</b>
          </button>
          <button class="set-chip" :class="{ on: lens === 'resignation' }" style="--acc: var(--set-gold)" @click="setLens('resignation')">
            <LogOut :size="12" /> Resignation <b>{{ counts.resignation }}</b>
          </button>
          <button class="set-chip" :class="{ on: lens === 'exit' }" style="--acc: var(--set-ok)" @click="setLens('exit')">
            <FileText :size="12" /> Exit reasons <b>{{ counts.exit }}</b>
          </button>
          <button class="set-chip" :class="{ on: lens === 'voluntary' }" style="--acc: var(--set-ok)" @click="setLens('voluntary')">
            <ArrowUpRight :size="12" /> Voluntary <b>{{ counts.voluntary }}</b>
          </button>
          <button class="set-chip" :class="{ on: lens === 'involuntary' }" style="--acc: var(--set-conflict)" @click="setLens('involuntary')">
            <ShieldX :size="12" /> Involuntary <b>{{ counts.involuntary }}</b>
          </button>
          <button class="set-chip" :class="{ on: lens === 'inactive' }" style="--acc: var(--set-unset)" @click="setLens('inactive')">
            <PowerOff :size="12" /> Inactive <b>{{ rows.length - counts.active }}</b>
          </button>
        </div>
      </template>

      <div class="sr-powers">
        <Share2 :size="12" /><span class="sr-powers-lab">Powers</span>
        <button class="sr-mod" @click="$router.push('/admin/hr/exit/dashboard')"><DoorOpen :size="12" /> Exit Management</button>
        <button class="sr-mod alt" @click="$router.push('/admin/hr/exit/resignation')"><ExternalLink :size="12" /> Resignation board</button>
      </div>
    </SetSectionHead>

    <!-- signature instrument + lexicon intelligence -->
    <div class="sr-hero">
      <Motion as="div" class="sr-board-wrap"
        :initial="{ opacity: 0, scale: 0.985 }" :animate="{ opacity: 1, scale: 1 }" :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
        <div v-if="loading" class="sr-board-skel"><span class="sr-skel-beam" /></div>
        <DepartureBoard v-else :reasons="rows" :usage="usage" @select="openEdit" />
      </Motion>

      <Motion as="aside" class="sr-insight"
        :initial="{ opacity: 0, x: 16 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }">
        <header class="sr-insight-head"><Activity :size="14" /> Lexicon intelligence</header>

        <!-- voluntary ↔ involuntary balance -->
        <div class="sr-balance">
          <div class="sr-balance-bar">
            <span class="sr-balance-seg vol" :style="{ flex: balance.vol || 0.001 }" />
            <span class="sr-balance-seg neu" :style="{ flex: balance.neu || 0.001 }" />
            <span class="sr-balance-seg invol" :style="{ flex: balance.invol || 0.001 }" />
          </div>
          <div class="sr-balance-legend">
            <span><i class="vol" />{{ counts.voluntary }} voluntary</span>
            <span><i class="invol" />{{ counts.involuntary }} involuntary</span>
          </div>
        </div>

        <div class="sr-insight-row" v-for="(ins, i) in insights" :key="ins.key" :style="{ '--i': i }">
          <span class="sr-insight-ic" :data-tone="ins.tone"><component :is="ins.icon" :size="14" /></span>
          <div class="sr-insight-body"><b>{{ ins.value }}</b><span>{{ ins.label }}</span></div>
          <button v-if="ins.action" class="sr-insight-go" @click="ins.action()"><ArrowRight :size="12" /></button>
        </div>
      </Motion>
    </div>

    <!-- filter bar -->
    <div class="sr-bar">
      <div class="sr-search">
        <Search :size="14" />
        <input v-model="q" placeholder="Search reasons, codes…" />
      </div>
      <span class="sr-count set-mono">{{ visible.length }} / {{ rows.length }}</span>
    </div>

    <!-- cards -->
    <div v-if="loading" class="sr-grid">
      <div v-for="n in 6" :key="n" class="sr-card-skel" :style="{ '--i': n }"><span class="sr-skel-beam" /></div>
    </div>
    <SetEmptyState v-else-if="!visible.length" :icon="DoorOpen" accent-color="var(--set-rust)"
      :title="hasFilter ? 'No reasons match' : 'No separation reasons yet'"
      :sub="hasFilter ? 'Try a different search or filter.' : 'The vocabulary of why people leave — consumed by Exit Management.'">
      <button v-if="hasFilter" class="set-btn set-btn-ghost" @click="clearFilters"><FilterX :size="14" /> Clear</button>
      <button v-else class="set-btn set-btn-primary" @click="openCreate"><Plus :size="14" /> New reason</button>
    </SetEmptyState>
    <div v-else class="sr-grid">
      <SeparationReasonCard v-for="(c, i) in visible" :key="c.id" :reason="c" :index="i" :cited="citedOf(c)"
        @edit="openEdit" @delete="openDelete" @toggle="toggleActive" />
    </div>

    <SeparationReasonModal :open="formOpen" :edit-target="editTarget" :saving="saving"
      :lock-code="!!editTarget?.is_system" @close="formOpen = false" @save="save" />
    <SeparationReasonDeleteModal :open="delOpen" :loading="deleting" :target="delTarget"
      :cited="delTarget ? citedOf(delTarget) : 0"
      @close="delOpen = false" @confirm="doDelete" @deactivate="doDeactivate" @view-exits="viewExits" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'
import axios from 'axios'
import {
  DoorOpen, RefreshCw, Plus, Layers, LogOut, FileText, ArrowUpRight, ShieldX, PowerOff,
  Share2, ExternalLink, Search, FilterX, Activity, ArrowRight, Crown, Ghost, Sparkles, Link2, ScanLine,
} from 'lucide-vue-next'
import { API, authHeader } from '@/utils/api'
import SetSectionHead from '../components/SetSectionHead.vue'
import SetEmptyState from '../components/SetEmptyState.vue'
import DepartureBoard from '../components/DepartureBoard.vue'
import SeparationReasonCard from '../components/SeparationReasonCard.vue'
import SeparationReasonModal from '../components/SeparationReasonModal.vue'
import SeparationReasonDeleteModal from '../components/SeparationReasonDeleteModal.vue'
import { MASTER_DOMAINS } from '../components/masterDomains'
import { listMaster, createMaster, updateMaster, deleteMaster, errText } from '../composables/useHrSettings'
import { syncReferenceSlice } from '@/composables/useEmployees'

const toast = useToast()
const router = useRouter()
const domain = MASTER_DOMAINS['separation-reasons']
const BASE = domain.base  // 'settings/masters/separation-reasons'
const h = () => ({ headers: authHeader() })

const rows = ref([])
const usage = ref({})       // { RESIGNATION_TYPE:{code:n}, EXIT_REASON:{code:n} }
const loading = ref(false)
const q = ref('')
const lens = ref('all')

async function fetchUsage() {
  try {
    const res = await axios.get(`${API}/hr/${BASE}/usage`, h())
    usage.value = res.data?.items || {}
  } catch { usage.value = {} }   // backend not yet restarted → degrade to no telemetry
}

async function reload() {
  loading.value = true
  try {
    const list = await listMaster(BASE)
    rows.value = list
    syncReferenceSlice(BASE, list)   // keep the exit pickers live with this edit
    await fetchUsage()
  } catch (e) { toast.error(errText(e, 'Failed to load separation reasons')) }
  finally { loading.value = false }
}
onMounted(reload)

// ── derived ──
const citedOf = (r) => Number(usage.value?.[r.category]?.[r.code] || 0)
const counts = computed(() => {
  const r = rows.value
  return {
    active: r.filter(x => x.is_active !== false).length,
    resignation: r.filter(x => x.category === 'RESIGNATION_TYPE').length,
    exit: r.filter(x => x.category === 'EXIT_REASON').length,
    voluntary: r.filter(x => x.is_voluntary === true).length,
    involuntary: r.filter(x => x.is_voluntary === false).length,
  }
})
const balance = computed(() => ({
  vol: rows.value.filter(x => x.is_voluntary === true).length,
  invol: rows.value.filter(x => x.is_voluntary === false).length,
  neu: rows.value.filter(x => x.is_voluntary !== true && x.is_voluntary !== false).length,
}))
const totalCited = computed(() => rows.value.reduce((a, r) => a + citedOf(r), 0))

const setLens = (k) => { lens.value = lens.value === k ? 'all' : k }
const hasFilter = computed(() => !!q.value || lens.value !== 'all')
const visible = computed(() => {
  const term = q.value.trim().toLowerCase()
  return rows.value.filter((c) => {
    if (lens.value === 'resignation' && c.category !== 'RESIGNATION_TYPE') return false
    if (lens.value === 'exit' && c.category !== 'EXIT_REASON') return false
    if (lens.value === 'voluntary' && c.is_voluntary !== true) return false
    if (lens.value === 'involuntary' && c.is_voluntary !== false) return false
    if (lens.value === 'inactive' && c.is_active !== false) return false
    if (term && ![c.label, c.code, c.description].some((v) => String(v || '').toLowerCase().includes(term))) return false
    return true
  })
})
const clearFilters = () => { q.value = ''; lens.value = 'all' }

// ── lexicon intelligence ──
const insights = computed(() => {
  const out = []
  // most-cited reason (proves the master ↔ exit data linkage)
  let top = null, max = 0
  for (const r of rows.value) { const c = citedOf(r); if (c > max) { max = c; top = r } }
  if (top) out.push({ key: 'top', icon: Crown, tone: 'gold', value: `${top.label} · ${max}`, label: 'most-cited reason across exit cases', action: () => openEdit(top) })
  else out.push({ key: 'top', icon: ScanLine, tone: 'gold', value: totalCited.value, label: 'exit cases classified by this lexicon' })
  // ghost: deactivated reason still cited by exits (the connectivity loophole)
  const ghost = rows.value.filter(r => r.is_active === false && citedOf(r) > 0).reduce((a, r) => a + citedOf(r), 0)
  out.push({ key: 'ghost', icon: Ghost, tone: ghost ? 'warn' : 'ok', value: ghost,
    label: ghost ? 'exits cite a deactivated reason — re-classify them' : 'no exit cites a retired reason', action: ghost ? () => setLens('inactive') : null })
  // connectivity — active reasons feed exit pickers live
  out.push({ key: 'link', icon: Link2, tone: 'ok', value: counts.value.active, label: 'active reasons offered live in Exit pickers', action: () => router.push('/admin/hr/exit/resignation') })
  // custom additions beyond the enum-backed built-ins
  const custom = rows.value.filter(r => !r.is_system).length
  out.push({ key: 'custom', icon: Sparkles, tone: 'gold', value: custom, label: custom ? `custom reason${custom === 1 ? '' : 's'} beyond the built-ins` : 'using the built-in lexicon only' })
  return out
})

// ── CRUD ──
const formOpen = ref(false)
const editTarget = ref(null)
const saving = ref(false)
const openCreate = () => { editTarget.value = null; formOpen.value = true }
const openEdit = (c) => { editTarget.value = c; formOpen.value = true }

async function save(form) {
  saving.value = true
  try {
    const payload = {
      label: form.label, code: form.code, category: form.category,
      is_voluntary: form.is_voluntary, is_active: form.is_active, description: form.description || '',
    }
    if (editTarget.value) await updateMaster(BASE, editTarget.value.id, payload)
    else await createMaster(BASE, payload)
    toast.success(editTarget.value ? 'Reason updated' : 'Reason added to the lexicon')
    formOpen.value = false
    await reload()
  } catch (e) { toast.error(errText(e, 'Failed to save reason')) }
  finally { saving.value = false }
}

// Built-in reasons CAN be deactivated here (curation is the whole point of the
// master ↔ exit link) — only DELETE is locked for them at the backend.
async function toggleActive(c) {
  const next = c.is_active === false
  c.is_active = next
  try { await updateMaster(BASE, c.id, { is_active: next }) }
  catch (e) { c.is_active = !next; toast.error(errText(e, 'Failed to update')) }
}

const delOpen = ref(false)
const delTarget = ref(null)
const deleting = ref(false)
const openDelete = (c) => { delTarget.value = c; delOpen.value = true }
async function doDelete(reason) {
  deleting.value = true
  try {
    await deleteMaster(BASE, delTarget.value.id, reason)
    toast.success('Reason removed from the lexicon')
    delOpen.value = false
    await reload()
  } catch (e) { toast.error(errText(e, 'Re-classify exits or deactivate instead')) }
  finally { deleting.value = false }
}
async function doDeactivate(c) {
  deleting.value = true
  try {
    await updateMaster(BASE, c.id, { is_active: false })
    toast.success(`${c.label} deactivated — hidden from Exit pickers`)
    delOpen.value = false
    await reload()
  } catch (e) { toast.error(errText(e, 'Failed to deactivate')) }
  finally { deleting.value = false }
}

const viewExits = () => router.push('/admin/hr/exit/dashboard')
</script>

<style scoped>
.sr { display: flex; flex-direction: column; gap: 16px; }
.sr-lenses { display: flex; flex-wrap: wrap; gap: 8px; }
.sr-lenses .set-chip b { color: var(--set-text); }

.sr-powers { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--set-border); }
.sr-powers > svg { color: var(--set-text-dim); }
.sr-powers-lab { font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--set-text-dim); }
.sr-mod { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; cursor: pointer; font: inherit;
  font-size: 11.5px; font-weight: 600; color: var(--set-text-secondary); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); }
.sr-mod:hover { color: var(--set-rust); border-color: color-mix(in srgb, var(--set-rust) 40%, transparent); transform: translateY(-1px); }
.sr-mod :deep(svg) { color: var(--set-rust); }
.sr-mod.alt { color: var(--set-text-muted); }
.sr-mod.alt :deep(svg) { color: var(--set-text-muted); }

.sr-hero { display: grid; grid-template-columns: 1.62fr 1fr; gap: 16px; align-items: stretch; }
@media (max-width: 980px) { .sr-hero { grid-template-columns: 1fr; } }
.sr-board-wrap { min-width: 0; }
.sr-board-skel { position: relative; overflow: hidden; width: 100%; min-height: 380px; border-radius: 20px; background: var(--set-surface); border: 1px solid var(--set-border); }

.sr-insight { display: flex; flex-direction: column; gap: 10px; padding: 16px; border-radius: 18px; background: var(--set-surface); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow); }
.sr-insight-head { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--set-rust); }
.sr-insight-head :deep(svg) { color: var(--set-rust); }

.sr-balance { display: flex; flex-direction: column; gap: 7px; padding: 11px; border-radius: 12px; background: var(--set-panel); border: 1px solid var(--set-border); }
.sr-balance-bar { display: flex; height: 10px; border-radius: 999px; overflow: hidden; background: var(--set-unset-soft); }
.sr-balance-seg { transition: flex 0.5s var(--set-spring); }
.sr-balance-seg.vol { background: linear-gradient(90deg, #34d399, #059669); }
.sr-balance-seg.neu { background: var(--set-unset); opacity: 0.5; }
.sr-balance-seg.invol { background: linear-gradient(90deg, #f87171, #dc2626); }
.sr-balance-legend { display: flex; justify-content: space-between; font-size: 10px; color: var(--set-text-muted); }
.sr-balance-legend span { display: inline-flex; align-items: center; gap: 5px; }
.sr-balance-legend i { width: 8px; height: 8px; border-radius: 2px; }
.sr-balance-legend i.vol { background: #34d399; } .sr-balance-legend i.invol { background: #f87171; }

.sr-insight-row { display: flex; align-items: center; gap: 11px; padding: 10px 11px; border-radius: 12px; background: var(--set-panel); border: 1px solid var(--set-border);
  animation: set-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.07s + 0.15s); }
.sr-insight-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; }
.sr-insight-ic[data-tone="gold"] { color: var(--set-gold); background: color-mix(in srgb, var(--set-gold) 14%, transparent); }
.sr-insight-ic[data-tone="warn"] { color: var(--set-partial); background: var(--set-partial-soft); }
.sr-insight-ic[data-tone="ok"] { color: var(--set-ok); background: var(--set-ok-soft); }
.sr-insight-body { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.25; }
.sr-insight-body b { font-size: 13.5px; font-weight: 850; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sr-insight-body span { font-size: 10.5px; color: var(--set-text-muted); }
.sr-insight-go { width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0; display: grid; place-items: center; cursor: pointer;
  color: var(--set-text-muted); background: var(--set-surface-elevated); border: 1px solid var(--set-border); transition: all 0.2s; }
.sr-insight-go:hover { color: var(--set-rust); border-color: color-mix(in srgb, var(--set-rust) 40%, transparent); transform: translateX(2px); }

.sr-bar { display: flex; align-items: center; gap: 12px; }
.sr-search { flex: 1; min-width: 200px; display: flex; align-items: center; gap: 8px; padding: 9px 13px; border-radius: 11px; background: var(--set-surface); border: 1px solid var(--set-border); color: var(--set-text-dim); }
.sr-search:focus-within { border-color: var(--set-border-warm); }
.sr-search input { flex: 1; min-width: 0; border: none; background: none; outline: none; font: inherit; font-size: 13px; color: var(--set-text); }
.sr-count { font-size: 11px; color: var(--set-text-dim); }

.sr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 14px; }
@media (max-width: 520px) { .sr-grid { grid-template-columns: 1fr; } }
.sr-card-skel { position: relative; overflow: hidden; height: 200px; border-radius: 16px; background: var(--set-surface); border: 1px solid var(--set-border);
  animation: set-deal 0.5s var(--set-spring) both; animation-delay: calc(var(--i) * 0.06s); }
.sr-skel-beam { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(180,83,9,0.08) 50%, transparent 70%); background-size: 220% 100%; animation: set-sheen 1.5s ease infinite; }

@media (prefers-reduced-motion: reduce) { .sr-insight-row, .sr-card-skel, .sr-skel-beam, .sr-balance-seg { animation: none; transition: none; } }
</style>
