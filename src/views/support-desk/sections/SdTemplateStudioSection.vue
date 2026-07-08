<template>
  <div class="tps">
    <!-- ── the Copperplate console: full-bleed Letterpress + glass console + lenses ── -->
    <SdTemplateHero :lenses="lenses" :active-lens="lens" :stats="stats" :loading="loading" :reduced="reduced"
      @pick="onLens" @new="openCreate" @refresh="reload">
      <template #instrument>
        <SdTemplateInstrument :stats="stats" :templates="templates" :reduced="reduced" @pick="openEdit" />
      </template>
    </SdTemplateHero>

    <!-- ── the plate case ── -->
    <SdTemplateLibrary v-model:q="q" v-model:sort="sort"
      :templates="shown" :lens="lens" :loading="loading" :is-virgin="isVirgin"
      :busy-ids="busyIds" :cat-names="catNames" :team-names="teamNames"
      @apply="applyTpl" @edit="openEdit" @clone="cloneTpl" @pin="togglePin"
      @activate="activateTpl" @retire="openRetire" @new="openCreate" />

    <!-- ── modals ── -->
    <SdTemplateWizard :open="wizardOpen" :template="wizardTpl" :pickers="pickers" :teams="teams" :agents="agents"
      :busy="busy" @close="wizardOpen = false" @save="saveWizard" />
    <SdTemplateRetireModal :open="!!retireTpl" :t="retireTpl" :busy="busy"
      @close="retireTpl = null" @archive="archiveTpl" @delete="deleteTpl" />
  </div>
</template>

<script setup>
/* SdTemplateStudioSection — "The Copperplate Studio", the ADMIN Templates desk.
   Orchestrator per the desk convention: ONE window fetch (all statuses) + the
   sealed /stats aggregate + pickers, then every lens / search / sort runs
   client-side. Signature instrument = The Letterpress (gallery pick 01) mounted
   through the hero's #instrument slot. Apply = deep-link to the admin New
   Ticket intake (?template=<id>) — the intake calls /apply, which counts the
   strike server-side. The employee panel never reaches this file (panel-split
   in SdTemplatesSection.vue). */
import { ref, computed, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import {
  LayoutGrid, Stamp, NotebookPen, Archive, Pin, CircleDashed, Flame,
} from 'lucide-vue-next'
import SdTemplateHero from '../components/SdTemplateHero.vue'
import SdTemplateInstrument from '../components/SdTemplateInstrument.vue'
import SdTemplateLibrary from '../components/SdTemplateLibrary.vue'
import SdTemplateWizard from '../modals/SdTemplateWizard.vue'
import SdTemplateRetireModal from '../modals/SdTemplateRetireModal.vue'
import {
  listTemplates, createTemplate, updateTemplate, deleteTemplate,
  getTemplate, cloneTemplate, fetchTemplateStats,
  loadPickers, usePickers, listTeams, listSupportAgents,
} from '@/composables/useSupportDesk'

defineProps({ panel: { type: String, default: 'admin' }, agentReveal: { type: Boolean, default: false } })

const route = useRoute()
const router = useRouter()
const toast = useToast()
const pickers = usePickers()

/* ── state (refs first — TDZ discipline) ── */
const templates = ref([])
const stats = ref({})
const teams = ref([])
const agents = ref([])
const loading = ref(true)
const busy = ref(false)
const busyIds = reactive(new Set())
const q = ref('')
const lens = ref('all')
const sort = ref('pinned')
const wizardOpen = ref(false)
const wizardTpl = ref(null)
const retireTpl = ref(null)

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  && document.documentElement.dataset.cinematic !== 'on'

/* ── load: one window + sealed stats + pickers ── */
const reload = async () => {
  loading.value = true
  try {
    const [tpls, st] = await Promise.all([
      listTemplates({ status: 'all' }),
      fetchTemplateStats().catch(() => ({})),
    ])
    templates.value = tpls || []
    stats.value = st || {}
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not load the plate case')
    templates.value = []
  } finally {
    loading.value = false
  }
}
onMounted(() => {
  reload()
  loadPickers().catch(() => {})
  listTeams().then((r) => { teams.value = r?.items || r || [] }).catch(() => {})
  listSupportAgents().then((r) => { agents.value = r?.items || r || [] }).catch(() => {})
})

/* ── name maps for cards ── */
const catNames = computed(() => new Map((pickers.categories || []).map((c) => [String(c.id), c.name])))
const teamNames = computed(() => new Map((teams.value || []).map((t) => [String(t.id), t.name])))

/* ── lenses (hero dock) ── */
const lenses = computed(() => {
  const s = stats.value || {}
  return [
    { key: 'all', label: 'Working set', icon: LayoutGrid, value: (s.active ?? 0) + (s.draft ?? 0), color: 'var(--sd-tpl-core)' },
    { key: 'active', label: 'Active plates', icon: Stamp, value: s.active ?? 0, color: 'var(--sd-tpl-hi)' },
    { key: 'drafts', label: 'Galley · drafts', icon: NotebookPen, value: s.draft ?? 0, color: 'var(--sd-tpl-ink)' },
    { key: 'pinned', label: 'Pinned', icon: Pin, value: s.pinned ?? 0, color: 'var(--sd-tpl-hi)' },
    { key: 'top', label: 'Most struck', icon: Flame, value: s.usage_total ?? 0, color: 'var(--sd-tpl-use)' },
    { key: 'unused', label: 'Never used', icon: CircleDashed, value: s.unused ?? 0, color: 'var(--sd-tpl-arch)' },
    { key: 'archived', label: 'Archive drawer', icon: Archive, value: s.archived ?? 0, color: 'var(--sd-tpl-arch)' },
  ]
})
const onLens = (l) => { lens.value = l.key }

/* ── client-side lensing / search / sort ── */
const isVirgin = computed(() => !loading.value && templates.value.length === 0)
const shown = computed(() => {
  let list = [...templates.value]
  const st = (t) => t.status || 'active'
  if (lens.value === 'all') list = list.filter((t) => st(t) !== 'archived')
  else if (lens.value === 'active') list = list.filter((t) => st(t) === 'active')
  else if (lens.value === 'drafts') list = list.filter((t) => st(t) === 'draft')
  else if (lens.value === 'archived') list = list.filter((t) => st(t) === 'archived')
  else if (lens.value === 'pinned') list = list.filter((t) => t.pinned && st(t) !== 'archived')
  else if (lens.value === 'unused') list = list.filter((t) => st(t) === 'active' && !(t.usage_count > 0))
  else if (lens.value === 'top') list = list.filter((t) => (t.usage_count || 0) > 0)

  const needle = q.value.trim().toLowerCase()
  if (needle) {
    list = list.filter((t) =>
      (t.name || '').toLowerCase().includes(needle)
      || (t.description || '').toLowerCase().includes(needle)
      || (t.subject || '').toLowerCase().includes(needle)
      || (t.tags || []).some((tag) => String(tag).toLowerCase().includes(needle)))
  }

  const byName = (a, b) => (a.name || '').localeCompare(b.name || '')
  if (sort.value === 'most-used' || lens.value === 'top') {
    list.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0) || byName(a, b))
  } else if (sort.value === 'recent') {
    list.sort((a, b) => new Date(b.last_used_at || 0) - new Date(a.last_used_at || 0) || byName(a, b))
  } else if (sort.value === 'newest') {
    list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
  } else {
    list.sort((a, b) => (b.pinned === true) - (a.pinned === true) || (a.sort_order || 0) - (b.sort_order || 0) || byName(a, b))
  }
  return list
})

/* ── actions ── */
const openCreate = () => { wizardTpl.value = null; wizardOpen.value = true }
const openEdit = async (t) => {
  try { wizardTpl.value = await getTemplate(t.id) } catch { wizardTpl.value = t }
  wizardOpen.value = true
}
const saveWizard = async (payload, statusTarget) => {
  busy.value = true
  try {
    if (wizardTpl.value?.id) {
      const body = { ...payload }
      if (statusTarget) body.status = statusTarget
      await updateTemplate(wizardTpl.value.id, body)
      toast.success('Plate updated')
    } else {
      await createTemplate({ ...payload, status: statusTarget || 'active' })
      toast.success(statusTarget === 'draft' ? 'Draft saved to the galley' : 'Plate cut and locked into the chase')
    }
    wizardOpen.value = false
    reload()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Save failed')
  } finally { busy.value = false }
}

/* Use = deep-link the admin intake; the intake's mount calls /apply (counts ONE
   strike) and strips the query param so refresh can't double-count. */
const applyTpl = (t) => {
  const base = route.path.startsWith('/admin') ? '/admin/support-desk' : '/user/support'
  router.push(`${base}/tickets/new?template=${t.id}`)
}

const withBusy = async (t, fn, okMsg) => {
  busyIds.add(t.id)
  try { await fn(); if (okMsg) toast.success(okMsg); await reload() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Action failed') }
  finally { busyIds.delete(t.id) }
}
const cloneTpl = (t) => withBusy(t, async () => {
  const copy = await cloneTemplate(t.id)
  toast.success(`Draft copy struck — “${copy.name}”`)
  wizardTpl.value = copy
  wizardOpen.value = true
})
const togglePin = (t) => withBusy(t, () => updateTemplate(t.id, { pinned: !t.pinned }))
const activateTpl = (t) => withBusy(t, () => updateTemplate(t.id, { status: 'active' }), 'Plate locked into the chase')
const openRetire = (t) => { retireTpl.value = t }
// The retire modal hands back { reason, note } — forwarded to the backend so the
// audit trail records WHY the plate was archived or deleted.
const archiveTpl = (payload = {}) => {
  const t = retireTpl.value
  if (!t) return
  withBusy(t, async () => {
    await updateTemplate(t.id, { status: 'archived' }, { reason: payload.reason, note: payload.note })
    retireTpl.value = null
  }, 'Plate moved to the archive drawer')
}
const deleteTpl = (payload = {}) => {
  const t = retireTpl.value
  if (!t) return
  withBusy(t, async () => {
    await deleteTemplate(t.id, { reason: payload.reason, note: payload.note })
    retireTpl.value = null
  }, 'Plate removed from the studio')
}
</script>

<style scoped>
.tps { display: flex; flex-direction: column; gap: 16px; color: var(--sd-text); }
</style>
