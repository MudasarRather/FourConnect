<template>
  <div class="mat">
    <!-- ── mini-hero: asset vault console ── -->
    <section class="mat-hero" ref="heroRef">
      <div class="mh-grain trn-grain" aria-hidden="true" />
      <div class="mh-spot trn-spotlight" aria-hidden="true" />
      <div class="mh-in">
        <div class="mh-head">
          <Motion as="span" class="mh-eyebrow"
            :initial="{ opacity: 0, y: -8 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
            <Library :size="13" /> Catalog · Asset Vault
          </Motion>
          <Motion as="h2" class="mh-title"
            :initial="{ opacity: 0, y: 18, filter: 'blur(8px)' }" :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
            :transition="{ duration: 0.7, delay: 0.08, ease: [0.16, 1, 0.3, 1] }">
            The asset <span class="grad">vault</span>
          </Motion>
          <Motion as="p" class="mh-sub"
            :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }">
            Documents, recordings, decks and quizzes — every learning asset orbiting your programs.
          </Motion>
        </div>
        <Motion as="button" class="trn-btn trn-btn-primary mh-cta"
          :initial="{ opacity: 0, scale: 0.9 }" :animate="{ opacity: 1, scale: 1 }"
          :transition="{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }"
          :whileHover="{ y: -3, scale: 1.03 }" :whileTap="{ scale: 0.96 }" @click="openCreate">
          <Plus :size="16" /> New material
        </Motion>
      </div>

      <Motion as="div" class="mh-stats"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.6, delay: 0.38, ease: [0.16, 1, 0.3, 1] }">
        <div v-for="(st, i) in heroStats" :key="st.key" class="mh-stat" :style="{ '--c': st.color }">
          <span class="mh-dot" :style="{ '--d': (i * 0.3) + 's' }" />
          <span class="mh-val"><TrnCountUp :value="st.value" /></span>
          <span class="mh-lab">{{ st.label }}</span>
        </div>
      </Motion>
    </section>

    <!-- toolbar: animated type chips + search -->
    <div class="mat-bar">
      <div class="mat-chips">
        <Motion as="button" class="chip" :class="{ on: !typeFilter }"
          :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }"
          :whileTap="{ scale: 0.95 }" @click="typeFilter = ''">
          <Layers :size="13" /> All <span class="chip-n">{{ materials.length }}</span>
        </Motion>
        <Motion v-for="(t, i) in MATERIAL_TYPES" :key="t" as="button" class="chip" :class="{ on: typeFilter === t }"
          :style="{ '--c': typeColor(t) }"
          :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.34, delay: 0.04 * (i + 1), ease: [0.16, 1, 0.3, 1] }"
          :whileTap="{ scale: 0.95 }" @click="typeFilter = typeFilter === t ? '' : t">
          <component :is="typeIcon(t)" :size="13" /> {{ label(t) }} <span class="chip-n">{{ typeCount(t) }}</span>
        </Motion>
      </div>
      <div class="mat-tools">
        <div class="mat-search" :class="{ focus: searchFocus }">
          <Search :size="15" />
          <input v-model="search" placeholder="Search assets…" @focus="searchFocus = true" @blur="searchFocus = false" />
        </div>
      </div>
    </div>

    <!-- loading -->
    <div v-if="loading" class="mat-grid">
      <div v-for="n in 8" :key="n" class="trn-skel" style="height: 226px; border-radius: 18px" />
    </div>

    <!-- empty -->
    <TrnEmptyState v-else-if="!filtered.length" :icon="Library" title="No materials yet"
      :sub="search || typeFilter ? 'No assets match your filters — try clearing them.' : 'Add your first learning asset and link it to a program.'">
      <button v-if="!search && !typeFilter" class="trn-btn trn-btn-primary" @click="openCreate" style="margin-top:16px"><Plus :size="15" /> New material</button>
      <button v-else class="trn-btn trn-btn-ghost" @click="clearFilters" style="margin-top:16px">Clear filters</button>
    </TrnEmptyState>

    <!-- media tiles -->
    <TransitionGroup v-else name="mat-list" tag="div" class="mat-grid">
      <Motion v-for="(m, i) in filtered" :key="m.id" as="article" class="mtile" :style="{ '--c': typeColor(m.material_type) }"
        :initial="{ opacity: 0, y: 22, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
        :transition="{ duration: 0.5, delay: Math.min(i * 0.045, 0.4), ease: [0.16, 1, 0.3, 1] }">
        <!-- type-driven cover -->
        <div class="mt-cover">
          <span class="mt-dots" aria-hidden="true" />
          <span class="mt-shine" aria-hidden="true" />
          <component :is="typeIcon(m.material_type)" :size="78" class="mt-water" aria-hidden="true" />
          <span v-if="m.material_type === 'VIDEO'" class="mt-play" aria-hidden="true"><Play :size="16" /></span>
          <span class="mt-badge"><component :is="typeIcon(m.material_type)" :size="11" /> {{ label(m.material_type) }}</span>
        </div>
        <!-- body -->
        <div class="mt-body">
          <h3 :title="m.title">{{ m.title }}</h3>
          <span class="mt-prog"><BookOpen :size="11" /> {{ m.program_name || 'General' }}</span>
          <p v-if="m.description" class="mt-desc">{{ m.description }}</p>
        </div>
        <!-- actions -->
        <div class="mt-foot">
          <a v-if="m.external_url || m.file_url" class="mt-act link" :href="resolveUrl(m)" target="_blank" rel="noopener noreferrer">
            <ExternalLink :size="14" /> Open
          </a>
          <span v-else class="mt-act ghost-static">No link</span>
          <button class="mt-act" @click="openEdit(m)"><Pencil :size="14" /> Edit</button>
          <button class="mt-act danger" @click="confirmDelete(m)" aria-label="Delete"><Trash2 :size="14" /></button>
        </div>
      </Motion>
    </TransitionGroup>

    <MaterialFormModal :open="modalOpen" :material="editing" :programs="programs"
      @close="modalOpen = false" @saved="onSaved" />

    <TrnDeleteModal
      :open="deleteOpen"
      title="Delete material"
      :item-name="deleteTarget?.title || ''"
      :item-meta="deleteTarget ? `${label(deleteTarget.material_type)} · ${deleteTarget.program_name || 'General'}` : ''"
      :icon="deleteTarget ? typeIcon(deleteTarget.material_type) : Trash2"
      :reasons="DELETE_REASONS"
      require-reason
      :consequences="['Removes this asset from its program', 'Any link to this file or URL will stop working', 'This cannot be recovered']"
      confirm-label="Delete material"
      :loading="deleting"
      @close="deleteOpen = false"
      @confirm="doDelete" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  Search, Plus, Library, BookOpen, ExternalLink, Pencil, Trash2, Layers, Play,
  FileText, Video, Link as LinkIcon, Presentation, HelpCircle, File,
} from 'lucide-vue-next'
import { API_BASE } from '@/utils/api'
import TrnEmptyState from '../components/TrnEmptyState.vue'
import TrnCountUp from '../components/TrnCountUp.vue'
import TrnDeleteModal from '../components/TrnDeleteModal.vue'
import MaterialFormModal from '../modals/MaterialFormModal.vue'
import { MATERIAL_TYPES, fetchMaterials, deleteMaterial, fetchTrainingPrograms } from '@/composables/useTraining'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const emit = defineEmits(['refresh-stats'])
const toast = useToast()

const materials = ref([])
const programs = ref([])
const loading = ref(true)
const search = ref('')
const searchFocus = ref(false)
const typeFilter = ref('')
const modalOpen = ref(false)
const editing = ref(null)
const deleteOpen = ref(false)
const deleteTarget = ref(null)
const deleting = ref(false)
const DELETE_REASONS = ['Outdated / superseded', 'Duplicate', 'Wrong file or link', 'No longer relevant', 'Other']

const heroRef = ref(null)
usePointerSpotlight(heroRef)

const programCount = computed(() => new Set(materials.value.map(m => m.program_id).filter(Boolean)).size)
const typeCount = (t) => materials.value.filter(m => m.material_type === t).length

const heroStats = computed(() => [
  { key: 'assets', label: 'Assets', value: materials.value.length, color: 'var(--trn-amber)' },
  { key: 'programs', label: 'Programs', value: programCount.value, color: 'var(--trn-amber-strong)' },
  { key: 'docs', label: 'Documents', value: typeCount('DOCUMENT'), color: 'var(--trn-amber)' },
  { key: 'videos', label: 'Videos', value: typeCount('VIDEO'), color: 'var(--trn-ember)' },
  { key: 'quizzes', label: 'Quizzes', value: typeCount('QUIZ'), color: 'var(--trn-type-safety)' },
])

const filtered = computed(() => {
  let rows = materials.value
  if (typeFilter.value) rows = rows.filter(m => m.material_type === typeFilter.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    rows = rows.filter(m =>
      (m.title || '').toLowerCase().includes(q) ||
      (m.program_name || '').toLowerCase().includes(q) ||
      (m.description || '').toLowerCase().includes(q))
  }
  return rows
})

const TYPE_ICONS = { DOCUMENT: FileText, VIDEO: Video, LINK: LinkIcon, SLIDE: Presentation, QUIZ: HelpCircle, OTHER: File }
const typeIcon = (t) => TYPE_ICONS[t] || File
const TYPE_COLORS = {
  DOCUMENT: 'var(--trn-amber)', VIDEO: 'var(--trn-ember)', LINK: 'var(--trn-amber-strong)',
  SLIDE: 'var(--trn-type-department)', QUIZ: 'var(--trn-type-safety)', OTHER: 'var(--trn-star-dim)',
}
const typeColor = (t) => TYPE_COLORS[t] || 'var(--trn-amber)'
const label = (t) => (t || 'OTHER').charAt(0) + (t || 'OTHER').slice(1).toLowerCase()

const resolveUrl = (m) => {
  const u = m.external_url || m.file_url || ''
  if (!u) return '#'
  if (/^https?:\/\//i.test(u)) return u
  return `${API_BASE}${u.startsWith('/') ? '' : '/'}${u}`
}

const clearFilters = () => { search.value = ''; typeFilter.value = '' }

const load = async () => {
  loading.value = true
  try {
    const [mats, progs] = await Promise.all([fetchMaterials(), fetchTrainingPrograms()])
    materials.value = mats
    programs.value = progs
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load materials')
  } finally {
    loading.value = false
  }
}
onMounted(load)

const openCreate = () => { editing.value = null; modalOpen.value = true }
const openEdit = (m) => { editing.value = m; modalOpen.value = true }
const onSaved = () => { load(); emit('refresh-stats') }

const confirmDelete = (m) => { deleteTarget.value = m; deleteOpen.value = true }

const doDelete = async ({ reason } = {}) => {
  const m = deleteTarget.value
  if (!m) return
  deleting.value = true
  try {
    await deleteMaterial(m.id)
    toast.success(`Material deleted${reason ? ` · ${reason}` : ''}`)
    deleteOpen.value = false
    deleteTarget.value = null
    load(); emit('refresh-stats')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not delete material')
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.mat { display: flex; flex-direction: column; gap: 18px; }

/* ── mini-hero ── */
.mat-hero { position: relative; overflow: hidden; border-radius: 24px; padding: 26px 28px 22px;
  background: var(--trn-dome); border: 1px solid var(--trn-border-soft); box-shadow: var(--trn-card-shadow); }
.mat-hero::before { content: ''; position: absolute; inset: 0; background: var(--trn-grad-hero); z-index: 0; }
.mh-grain { z-index: 1; }
.mh-spot { z-index: 1; }
.mh-in { position: relative; z-index: 2; display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
.mh-head { min-width: 0; }
.mh-eyebrow { display: inline-flex; align-items: center; gap: 7px; padding: 5px 11px; border-radius: 999px;
  background: color-mix(in srgb, var(--trn-amber) 12%, transparent); border: 1px solid var(--trn-border-strong);
  font-family: var(--trn-mono); font-size: 10px; letter-spacing: 0.13em; text-transform: uppercase; color: var(--trn-amber-strong); }
.mh-title { margin: 13px 0 0; font-size: 30px; line-height: 1.04; font-weight: 850; letter-spacing: -0.03em; color: var(--trn-text); }
.mh-title .grad { background: linear-gradient(110deg, #fbbf24, #fde68a 42%, #fb923c); -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; background-size: 220% auto; animation: trn-sheen 5s linear infinite; }
.mh-sub { margin: 10px 0 0; max-width: 540px; font-size: 13.5px; line-height: 1.55; color: var(--trn-text-secondary); }
.mh-cta { flex-shrink: 0; }

.mh-stats { position: relative; z-index: 2; display: flex; gap: 26px; flex-wrap: wrap; margin-top: 22px; padding-top: 18px;
  border-top: 1px solid var(--trn-border-soft); }
.mh-stat { position: relative; display: flex; flex-direction: column; gap: 1px; padding-left: 12px; }
.mh-dot { position: absolute; top: 5px; left: 0; width: 7px; height: 7px; border-radius: 50%; background: var(--c);
  box-shadow: 0 0 8px var(--c); animation: trn-pulse-dot 2.6s ease-out infinite; animation-delay: var(--d); }
.mh-val { font-family: var(--trn-mono); font-size: 24px; font-weight: 800; line-height: 1.1; color: var(--trn-text); }
.mh-lab { font-size: 10.5px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--trn-text-dim); }

/* ── toolbar ── */
.mat-bar { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.mat-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.chip { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 600;
  color: var(--trn-text-muted); background: var(--trn-surface); border: 1px solid var(--trn-border-soft); transition: color 0.22s, background 0.22s, border-color 0.22s, box-shadow 0.22s; }
.chip:hover { color: var(--trn-text); border-color: color-mix(in srgb, var(--c, var(--trn-amber)) 38%, transparent); }
.chip.on { color: var(--c, var(--trn-amber)); background: color-mix(in srgb, var(--c, var(--trn-amber)) 16%, transparent);
  border-color: color-mix(in srgb, var(--c, var(--trn-amber)) 42%, transparent); box-shadow: 0 0 16px -6px var(--c, var(--trn-amber)); }
.chip-n { font-family: var(--trn-mono); font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 999px; background: color-mix(in srgb, var(--trn-text) 8%, transparent); }
.chip.on .chip-n { background: color-mix(in srgb, var(--c, var(--trn-amber)) 24%, transparent); color: var(--c, var(--trn-amber)); }

.mat-tools { display: flex; align-items: center; gap: 10px; }
.mat-search { display: flex; align-items: center; gap: 8px; padding: 0 13px; border-radius: 11px; min-width: 210px;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); color: var(--trn-text-muted); transition: border-color 0.25s, box-shadow 0.25s; }
.mat-search.focus { border-color: color-mix(in srgb, var(--trn-amber) 55%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--trn-amber) 14%, transparent); }
.mat-search input { flex: 1; border: 0; background: transparent; padding: 10px 0; color: var(--trn-text); font: inherit; font-size: 13.5px; }
.mat-search input:focus { outline: none; }

/* ── grid ── */
.mat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(248px, 1fr)); gap: 16px; }

.mtile { position: relative; overflow: hidden; border-radius: 18px; border: 1px solid var(--trn-border-soft);
  background: var(--trn-surf-card); box-shadow: var(--trn-card-shadow); display: flex; flex-direction: column;
  transition: box-shadow 0.4s var(--trn-spring), border-color 0.4s, transform 0.4s var(--trn-spring); }
.mtile:hover { transform: translateY(-6px); box-shadow: var(--trn-card-shadow-hover), 0 0 38px -14px var(--c);
  border-color: color-mix(in srgb, var(--c) 40%, transparent); }

/* cover */
.mt-cover { position: relative; height: 116px; overflow: hidden; display: grid; place-items: center;
  background: linear-gradient(140deg, color-mix(in srgb, var(--c) 34%, var(--trn-surface)), color-mix(in srgb, var(--c) 7%, var(--trn-surface))); }
.mt-dots { position: absolute; inset: 0; opacity: 0.5;
  background-image: radial-gradient(color-mix(in srgb, var(--c) 26%, transparent) 1px, transparent 1px); background-size: 13px 13px;
  mask-image: linear-gradient(180deg, #000, transparent); -webkit-mask-image: linear-gradient(180deg, #000, transparent); }
.mt-water { position: absolute; right: -10px; bottom: -18px; color: var(--c); opacity: 0.22;
  transition: transform 0.55s var(--trn-spring), opacity 0.4s; }
.mtile:hover .mt-water { transform: scale(1.18) rotate(-8deg); opacity: 0.32; }
.mt-shine { position: absolute; inset: 0; opacity: 0; pointer-events: none;
  background: linear-gradient(104deg, transparent 38%, rgba(255,255,255,0.26) 50%, transparent 62%); background-size: 220% 100%; }
.mtile:hover .mt-shine { animation: mt-shine 0.95s ease; }
.mt-badge { position: absolute; top: 11px; left: 12px; display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--trn-mono); font-size: 9.5px; font-weight: 700; letter-spacing: 0.04em; padding: 4px 9px; border-radius: 999px;
  color: var(--c); background: color-mix(in srgb, var(--trn-canvas) 55%, transparent); border: 1px solid color-mix(in srgb, var(--c) 36%, transparent);
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
.mt-play { position: relative; z-index: 1; display: grid; place-items: center; width: 46px; height: 46px; border-radius: 50%;
  color: #1c1206; background: var(--c); box-shadow: 0 0 0 0 color-mix(in srgb, var(--c) 60%, transparent); animation: mt-play-pulse 2.4s ease-out infinite; }
.mt-play :deep(svg) { margin-left: 2px; }

/* body */
.mt-body { padding: 14px 16px 12px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
.mt-body h3 { margin: 0; font-size: 14.5px; font-weight: 700; color: var(--trn-text); line-height: 1.3;
  display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.mt-prog { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; font-size: 10.5px; font-weight: 600;
  padding: 3px 9px; border-radius: 999px; color: var(--trn-text-muted); background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.mt-desc { margin: 0; font-size: 12px; color: var(--trn-text-dim); line-height: 1.5;
  display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

/* footer */
.mt-foot { display: flex; gap: 6px; align-items: center; padding: 10px 12px; border-top: 1px solid var(--trn-border-soft); }
.mt-act { display: inline-flex; align-items: center; gap: 5px; font: inherit; font-size: 12px; font-weight: 600; padding: 6px 10px; border-radius: 9px;
  border: 1px solid var(--trn-border-soft); background: var(--trn-surface); color: var(--trn-text-secondary); cursor: pointer; transition: all 0.2s; text-decoration: none; }
.mt-act:hover { color: var(--trn-text); background: var(--trn-surface-elevated); transform: translateY(-1px); }
.mt-act.link { color: var(--trn-amber); }
.mt-act.link:hover { color: var(--trn-amber-bright); background: color-mix(in srgb, var(--trn-amber) 12%, transparent); }
.mt-act.ghost-static { color: var(--trn-text-dim); cursor: default; background: transparent; border-color: transparent; }
.mt-act.ghost-static:hover { transform: none; }
.mt-act.danger { margin-left: auto; color: var(--trn-st-failed); padding: 6px 9px; }
.mt-act.danger:hover { background: rgba(248,113,113,0.14); }

.mat-list-enter-active, .mat-list-leave-active { transition: all 0.4s var(--trn-spring); }
.mat-list-enter-from { opacity: 0; transform: translateY(14px) scale(0.97); }
.mat-list-leave-to { opacity: 0; transform: scale(0.95); }
.mat-list-leave-active { position: absolute; }

@keyframes mt-shine { 0% { opacity: 0; background-position: 130% 0; } 22% { opacity: 1; } 100% { opacity: 0; background-position: -40% 0; } }
@keyframes mt-play-pulse { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--c) 55%, transparent); } 50% { box-shadow: 0 0 0 8px color-mix(in srgb, var(--c) 0%, transparent); } }

@media (prefers-reduced-motion: reduce) {
  .mt-play { animation: none; }
  .mtile:hover .mt-shine { animation: none; }
  .mtile:hover { transform: none; }
  .mh-title .grad { animation: none; }
  .mh-dot { animation: none; }
}
@media (max-width: 760px) {
  .mh-title { font-size: 24px; }
  .mh-cta { width: 100%; }
  .mh-stats { gap: 18px; }
}
@media (max-width: 640px) {
  .mat-bar { flex-direction: column; align-items: stretch; }
  .mat-tools { justify-content: space-between; }
  .mat-search { flex: 1; }
}
</style>
