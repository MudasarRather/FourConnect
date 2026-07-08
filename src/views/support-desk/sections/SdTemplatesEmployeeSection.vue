<template>
  <div class="upr">
    <!-- ── the Projection Room console: full-bleed Holo-Lantern + glass console + lenses ── -->
    <SdUtplHero :lenses="lenses" :active-lens="lens" :stats="stats" :loading="loading" :reduced="reduced"
      @pick="onLens" @new="openCreate" @palette="paletteOpen = true" @refresh="reload">
      <template #instrument>
        <SdUtplInstrument :stats="stats" :templates="templates" :reduced="reduced" @pick="openPreview" />
      </template>
    </SdUtplHero>

    <!-- ── the slide case ── -->
    <SdUtplLibrary v-model:q="q" v-model:sort="sort"
      :templates="shown" :lens="lens" :loading="loading" :is-virgin="isVirgin"
      :my-id="myId" :busy-ids="busyIds" :cat-names="catNames"
      @use="useTpl" @run="openRun" @preview="openPreview" @clone="cloneToMine"
      @fav="toggleFav" @edit="openEdit" @retire="openRetire" @activate="activateTpl" @new="openCreate" />

    <!-- ── viewing booth ── -->
    <SdUtplPreviewDrawer :open="!!previewTpl" :t="previewTpl" :detail="previewDetail"
      :detail-loading="previewLoading" :cat-name="previewTpl ? (catNames.get(String(previewTpl.category_id)) || '') : ''"
      :mine="previewTpl ? isMine(previewTpl) : false"
      @close="previewTpl = null" @use="useTpl" @run="openRun" @clone="cloneToMine" />

    <!-- ── cutting bench (personal wizard) ── -->
    <SdUtplWizard :open="wizardOpen" :template="wizardTpl" :busy="busy"
      @close="wizardOpen = false" @save="saveWizard" />

    <!-- ── macro runner ── -->
    <SdUtplRunModal :open="runOpen" :t="runTpl" :me="me" @close="runOpen = false" @done="onRunDone" />

    <!-- ── retire (own personal slides only) — reasoned Shelve/Erase bench ── -->
    <SdUtplRetireModal :open="!!retireTpl" :t="retireTpl" :busy="busy"
      @close="retireTpl = null" @archive="archiveTpl" @delete="deleteTpl" />

    <!-- ── ⌘K quick apply ── -->
    <SdCommandPalette :open="paletteOpen" :commands="paletteCommands" @close="paletteOpen = false" @run="onPaletteRun" />
  </div>
</template>

<script setup>
/* SdTemplatesEmployeeSection — "THE CASSETTE EXCHANGE", the AGENT Templates desk
   (employee panel of the SdTemplatesSection split; the admin panel keeps the
   Copperplate Studio untouched).

   Orchestrator per the desk convention: ONE window fetch (all statuses — the
   backend seals the list to my visibility scope: global ∪ team ∪ my personal) +
   the sealed /stats (with my_* per-agent blocks) + pickers; every lens / search /
   sort runs client-side. Signature instrument = the Cassette Exchange (gallery
   pick 06 — supersedes the Holo-Lantern pick 05) mounted through the hero's
   #instrument slot.

   Workflows owned here:
   • Use  → deep-link the intake (?template=<id>); the intake calls /apply (counts
     ONE run) and strips the param — never call /apply from this desk.
   • Run  → the macro modal → owner-tier /me/tickets/{id}/run-template/{tpl}.
   • Forge/Edit/Retire → personal slides only (backend forces visibility).
   • Clone to mine → any visible slide becomes MY personal draft.
   • Star → optimistic per-user favorite.
   • Ctrl+K / '/' → quick-apply palette. */
import { ref, computed, reactive, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import {
  LayoutGrid, Star, Lock, Clock3, Pin, NotebookPen, Play, Zap, Film,
} from 'lucide-vue-next'
import SdUtplHero from '../components/SdUtplHero.vue'
import SdUtplInstrument from '../components/SdUtplInstrument.vue'
import SdUtplLibrary from '../components/SdUtplLibrary.vue'
import SdUtplPreviewDrawer from '../drawers/SdUtplPreviewDrawer.vue'
import SdUtplWizard from '../modals/SdUtplWizard.vue'
import SdUtplRunModal from '../modals/SdUtplRunModal.vue'
import SdUtplRetireModal from '../modals/SdUtplRetireModal.vue'
import SdCommandPalette from '../components/SdCommandPalette.vue'
import {
  listTemplates, createTemplate, updateTemplate, deleteTemplate,
  getTemplate, cloneTemplate, fetchTemplateStats, toggleTemplateFavorite,
  loadPickers, usePickers, getMe,
} from '@/composables/useSupportDesk'

defineProps({ panel: { type: String, default: 'employee' }, agentReveal: { type: Boolean, default: false } })
const emit = defineEmits(['go', 'changed', 'open', 'new'])

const route = useRoute()
const router = useRouter()
const toast = useToast()
const pickers = usePickers()

/* ── state (refs first — TDZ discipline) ── */
const templates = ref([])
const stats = ref({})
const me = ref({ id: null, name: '' })
const loading = ref(true)
const busy = ref(false)
const busyIds = reactive(new Set())
const q = ref('')
const lens = ref('all')
const sort = ref('pinned')
const wizardOpen = ref(false)
const wizardTpl = ref(null)
const previewTpl = ref(null)
const previewDetail = ref(null)
const previewLoading = ref(false)
const runOpen = ref(false)
const runTpl = ref(null)
const retireTpl = ref(null)
const paletteOpen = ref(false)

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  && document.documentElement.dataset.cinematic !== 'on'

const myId = computed(() => (me.value.id ? String(me.value.id) : ''))
const isMine = (t) => (t.visibility || 'global') === 'personal'
  && String(t.created_by_id || '') === (myId.value || '·')

/* ── load: one sealed window + sealed stats + pickers ── */
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
    toast.error(e?.response?.data?.detail || 'Could not load the tape exchange')
    templates.value = []
  } finally { loading.value = false }
}

const onKey = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); paletteOpen.value = !paletteOpen.value; return }
  if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(e.target?.tagName) && !e.target?.isContentEditable) {
    e.preventDefault(); paletteOpen.value = true
  }
}
onMounted(() => {
  reload()
  loadPickers().catch(() => {})
  getMe().then((m) => { me.value = { id: m?.id || null, name: m?.full_name || m?.name || '' } }).catch(() => {})
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const catNames = computed(() => new Map((pickers.categories || []).map((c) => [String(c.id), c.name])))

/* ── lenses (client-derived from the SEALED list, so counts always reconcile) ── */
const live = (t) => (t.status || 'active') !== 'archived'
const myRecentIds = computed(() => new Set((stats.value.my_recent || []).map((c) => String(c.id))))
const lenses = computed(() => {
  const L = templates.value
  return [
    { key: 'all', label: 'Working set', icon: LayoutGrid, value: L.filter(live).length, color: 'var(--sd-utpl-core)' },
    { key: 'favorites', label: 'Starred', icon: Star, value: L.filter((t) => t.is_favorite && live(t)).length, color: 'var(--sd-utpl-fav)' },
    { key: 'mine', label: 'My tapes', icon: Lock, value: L.filter((t) => isMine(t)).length, color: 'var(--sd-utpl-hi)' },
    { key: 'recent', label: 'Recently run', icon: Clock3, value: L.filter((t) => myRecentIds.value.has(String(t.id))).length, color: 'var(--sd-utpl-use)' },
    { key: 'pinned', label: 'Desk picks', icon: Pin, value: L.filter((t) => t.pinned && live(t)).length, color: 'var(--sd-utpl-deep)' },
    { key: 'drafts', label: 'My drafts', icon: NotebookPen, value: L.filter((t) => isMine(t) && (t.status || 'active') === 'draft').length, color: 'var(--sd-utpl-ink)' },
  ]
})
const onLens = (l) => { lens.value = l.key }

/* ── client-side lensing / search / sort ── */
const isVirgin = computed(() => !loading.value && templates.value.length === 0)
const shown = computed(() => {
  let list = [...templates.value]
  if (lens.value === 'all') list = list.filter(live)
  else if (lens.value === 'favorites') list = list.filter((t) => t.is_favorite && live(t))
  else if (lens.value === 'mine') list = list.filter((t) => isMine(t))
  else if (lens.value === 'recent') list = list.filter((t) => myRecentIds.value.has(String(t.id)))
  else if (lens.value === 'pinned') list = list.filter((t) => t.pinned && live(t))
  else if (lens.value === 'drafts') list = list.filter((t) => isMine(t) && (t.status || 'active') === 'draft')

  const needle = q.value.trim().toLowerCase()
  if (needle) {
    list = list.filter((t) =>
      (t.name || '').toLowerCase().includes(needle)
      || (t.description || '').toLowerCase().includes(needle)
      || (t.subject || '').toLowerCase().includes(needle)
      || (t.tags || []).some((tag) => String(tag).toLowerCase().includes(needle)))
  }

  const byName = (a, b) => (a.name || '').localeCompare(b.name || '')
  if (sort.value === 'most-used') list.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0) || byName(a, b))
  else if (sort.value === 'recent') list.sort((a, b) => new Date(b.last_used_at || 0) - new Date(a.last_used_at || 0) || byName(a, b))
  else if (sort.value === 'newest') list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
  else if (sort.value === 'name') list.sort(byName)
  else list.sort((a, b) => (b.is_favorite === true) - (a.is_favorite === true) || (b.pinned === true) - (a.pinned === true) || (a.sort_order || 0) - (b.sort_order || 0) || byName(a, b))
  return list
})

/* ── USE: deep-link the intake — it calls /apply (ONE counted run) + strips the param ── */
const useTpl = (t) => {
  const base = route.path.startsWith('/admin') ? '/admin/support-desk' : '/user/support'
  previewTpl.value = null
  router.push(`${base}/tickets/new?template=${t.id}`)
}

/* ── preview drawer (lazy detail for the revision strip) ── */
const openPreview = async (t) => {
  previewTpl.value = t
  previewDetail.value = null
  previewLoading.value = true
  try { previewDetail.value = await getTemplate(t.id) } catch { previewDetail.value = null }
  finally { previewLoading.value = false }
}

/* ── macro runner ── */
const openRun = (t) => {
  if ((t.status || 'active') === 'archived') { toast.warning('Shelved tapes can’t run — restore it first.'); return }
  previewTpl.value = null
  runTpl.value = t
  runOpen.value = true
}
const onRunDone = () => {
  runOpen.value = false
  reload()
  emit('changed')
}

/* ── favorites (optimistic star) ── */
const toggleFav = async (t) => {
  const was = !!t.is_favorite
  t.is_favorite = !was
  try { await toggleTemplateFavorite(t.id) }
  catch (e) { t.is_favorite = was; toast.error(e?.response?.data?.detail || 'Could not update the star') }
}

/* ── forge / edit / clone / lifecycle (personal slides) ── */
const openCreate = () => { wizardTpl.value = null; wizardOpen.value = true }
const openEdit = async (t) => {
  if (!isMine(t)) { openPreview(t); return }
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
      toast.success('Tape re-recorded — new dub saved')
    } else {
      await createTemplate({ ...payload, status: statusTarget || 'active' })
      toast.success(statusTarget === 'draft' ? 'Draft tape saved — unlabeled until you activate it' : 'Tape recorded and slotted into your rack')
    }
    wizardOpen.value = false
    reload()
    emit('changed')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Save failed')
  } finally { busy.value = false }
}

const withBusy = async (t, fn, okMsg) => {
  busyIds.add(t.id)
  try { await fn(); if (okMsg) toast.success(okMsg); await reload(); emit('changed') }
  catch (e) { toast.error(e?.response?.data?.detail || 'Action failed') }
  finally { busyIds.delete(t.id) }
}
const cloneToMine = (t) => withBusy(t, async () => {
  const copy = await cloneTemplate(t.id)
  toast.success(`Cloned into your kit — “${copy.name}” (personal draft)`)
  previewTpl.value = null
  wizardTpl.value = copy
  wizardOpen.value = true
})
const activateTpl = (t) => withBusy(t, () => updateTemplate(t.id, { status: 'active' }), 'Tape back in the rack')
const openRetire = (t) => { retireTpl.value = t }
// The retire modal hands back a { reason, note } — forwarded to the backend so the
// audit trail records WHY the tape was shelved or erased (not just that it happened).
const archiveTpl = (payload = {}) => {
  const t = retireTpl.value
  if (!t) return
  withBusy(t, async () => {
    await updateTemplate(t.id, { status: 'archived' }, { reason: payload.reason, note: payload.note })
    retireTpl.value = null
  }, 'Tape shelved — restore it any time')
}
const deleteTpl = (payload = {}) => {
  const t = retireTpl.value
  if (!t) return
  withBusy(t, async () => {
    await deleteTemplate(t.id, { reason: payload.reason, note: payload.note })
    retireTpl.value = null
  }, 'Tape erased from the exchange')
}

/* ── ⌘K quick apply ── */
const paletteCommands = computed(() => {
  const cmds = []
  templates.value.filter((t) => (t.status || 'active') === 'active' || isMine(t)).slice(0, 40).forEach((t) => {
    cmds.push({ id: `use-${t.id}`, label: `Use — ${t.name}`, hint: t.subject || 'prefill a new ticket', icon: Play, run: () => useTpl(t) })
    if ((t.status || 'active') !== 'archived') {
      cmds.push({ id: `run-${t.id}`, label: `Run on ticket — ${t.name}`, hint: 'macro: note or reply', icon: Zap, run: () => openRun(t) })
    }
  })
  cmds.push({ id: 'new', label: 'Record a personal template', hint: 'only you see and use it', icon: Film, run: openCreate })
  lenses.value.forEach((l) => cmds.push({ id: `lens-${l.key}`, label: `Lens — ${l.label}`, hint: `${l.value} tape(s)`, icon: l.icon, run: () => { lens.value = l.key } }))
  return cmds
})
const onPaletteRun = (it) => { paletteOpen.value = false; it.run?.() }
</script>

<style scoped>
.upr { display: flex; flex-direction: column; gap: 16px; color: var(--sd-text); }
</style>
