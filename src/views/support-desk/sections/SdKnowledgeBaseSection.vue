<template>
  <div class="sd-kb">
    <!-- Left rail: KB categories -->
    <aside class="sd-kb-rail sd-card">
      <div class="sd-kb-rail-head">
        <span class="sd-kb-rail-title">Categories</span>
      </div>
      <div class="sd-kb-cats">
        <button
          type="button"
          class="sd-kb-cat"
          :class="{ active: selectedCat === null }"
          @click="selectCat(null)"
        >
          <span class="sd-kb-cat-name"><Layers :size="14" /> All Articles</span>
          <span class="sd-kb-cat-count">{{ totalArticleCount }}</span>
        </button>
        <button
          v-for="c in categories"
          :key="c.id"
          type="button"
          class="sd-kb-cat"
          :class="{ active: selectedCat === c.id }"
          @click="selectCat(c.id)"
        >
          <span class="sd-kb-cat-name"><FolderOpen :size="14" /> {{ c.name }}</span>
          <span class="sd-kb-cat-count">{{ c.article_count ?? 0 }}</span>
        </button>
        <p v-if="!categories.length && !catLoading" class="sd-kb-cat-empty">No categories yet.</p>
      </div>

      <!-- Inline add-category row -->
      <div class="sd-kb-add">
        <template v-if="addingCat">
          <input
            ref="catInput"
            v-model="newCatName"
            class="sd-kb-add-input"
            placeholder="Category name"
            @keyup.enter="submitCat"
            @keyup.esc="cancelAddCat"
          />
          <button class="sd-kb-add-btn" type="button" :disabled="catSaving || !newCatName.trim()" @click="submitCat">
            <Check :size="14" />
          </button>
          <button class="sd-kb-add-btn ghost" type="button" @click="cancelAddCat"><X :size="14" /></button>
        </template>
        <button v-else class="sd-kb-add-toggle" type="button" @click="startAddCat">
          <Plus :size="14" /> Category
        </button>
      </div>
      <p v-if="catError" class="sd-kb-cat-error">{{ catError }}</p>
    </aside>

    <!-- Main area -->
    <div class="sd-kb-main">
      <div class="sd-toolbar">
        <div class="sd-search">
          <Search :size="15" />
          <input v-model="q" type="text" placeholder="Search articles…" @keyup.enter="reload" />
        </div>
        <div class="sd-filter"><SdSelect v-model="visibility" :options="visibilityOpts" placeholder="All visibility" /></div>
        <button class="sd-btn sd-btn-primary" @click="openCreate"><Plus :size="15" /> New Article</button>
      </div>

      <div v-if="articles.length" class="sd-kb-list">
        <Motion
          v-for="(a, i) in articles"
          :key="a.id"
          as="button"
          type="button"
          class="sd-kb-row sd-card"
          :initial="{ opacity: 0, y: 10 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.3, delay: Math.min(i * 0.025, 0.3), ease: [0.16, 1, 0.3, 1] }"
          @click="openEdit(a)"
        >
          <div class="sd-kb-row-main">
            <p class="sd-kb-row-title">{{ a.title }}</p>
            <p v-if="a.short_description" class="sd-kb-row-sub">{{ a.short_description }}</p>
          </div>
          <div class="sd-kb-row-meta">
            <span class="sd-vis-badge" :class="visClass(a.visibility)">{{ a.visibility || '—' }}</span>
            <span class="sd-status-badge" :class="statusClass(a.status)">{{ a.status || 'draft' }}</span>
            <span class="sd-kb-row-views"><Eye :size="12" /> {{ a.views ?? a.view_count ?? 0 }}</span>
            <span class="sd-kb-row-date">{{ fmtDate(a.updated_at) }}</span>
          </div>
        </Motion>
      </div>
      <div v-else class="sd-empty-state">
        <BookOpen :size="34" />
        <p>{{ loading ? 'Loading…' : 'No articles here yet.' }}</p>
        <button v-if="!loading" class="sd-btn sd-btn-primary" @click="openCreate"><Plus :size="15" /> Write your first</button>
      </div>
    </div>

    <SdArticleModal
      :open="modalOpen"
      :article="editing"
      :categories="categories"
      :default-category-id="selectedCat"
      @close="modalOpen = false"
      @saved="onSaved"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { Motion } from 'motion-v'
import { Search, Plus, BookOpen, Layers, FolderOpen, Eye, Check, X } from 'lucide-vue-next'
import SdSelect from '../components/SdSelect.vue'
import SdArticleModal from '../modals/SdArticleModal.vue'
import { listKbCategories, createKbCategory, listArticles } from '@/composables/useSupportDesk'

const props = defineProps({
  dashboard: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  createSignal: { type: Number, default: 0 },
})
const emit = defineEmits(['go', 'changed'])

const categories = ref([])
const articles = ref([])
const catLoading = ref(true)
const loading = ref(true)
const q = ref('')
const visibility = ref(null)
const selectedCat = ref(null)
const modalOpen = ref(false)
const editing = ref(null)

const addingCat = ref(false)
const newCatName = ref('')
const catInput = ref(null)
const catSaving = ref(false)
const catError = ref('')

const visibilityOpts = [
  { value: null, label: 'All visibility' },
  { value: 'public', label: 'Public' },
  { value: 'customer', label: 'Customer' },
  { value: 'internal', label: 'Internal' },
]

const totalArticleCount = computed(() =>
  categories.value.reduce((sum, c) => sum + (c.article_count ?? 0), 0)
)

const visClass = (v) => ({ public: 'is-success', customer: 'is-amber', internal: 'is-steel' }[v] || 'is-steel')
const statusClass = (s) => ({ draft: 'is-draft', published: 'is-published', archived: 'is-archived' }[s] || 'is-draft')

const fmtDate = (v) => {
  if (!v) return '—'
  const d = new Date(v)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

const loadCategories = async () => {
  catLoading.value = true
  try { categories.value = (await listKbCategories()) || [] }
  catch { categories.value = [] }
  finally { catLoading.value = false }
}

const reload = async () => {
  loading.value = true
  try {
    const params = {}
    if (selectedCat.value) params.category_id = selectedCat.value
    if (visibility.value) params.visibility = visibility.value
    if (q.value.trim()) params.q = q.value.trim()
    articles.value = (await listArticles(params)) || []
  } catch { articles.value = [] }
  finally { loading.value = false }
}

const selectCat = (id) => { selectedCat.value = id; reload() }

const startAddCat = async () => {
  addingCat.value = true
  catError.value = ''
  newCatName.value = ''
  await nextTick()
  catInput.value?.focus()
}
const cancelAddCat = () => { addingCat.value = false; newCatName.value = ''; catError.value = '' }
const submitCat = async () => {
  const name = newCatName.value.trim()
  if (!name) return
  catSaving.value = true; catError.value = ''
  try {
    await createKbCategory({ name })
    cancelAddCat()
    await loadCategories()
    emit('changed')
  } catch (e) { catError.value = e?.response?.data?.detail || 'Could not create category.' }
  finally { catSaving.value = false }
}

const openCreate = () => { editing.value = null; modalOpen.value = true }
const openEdit = (a) => { editing.value = a; modalOpen.value = true }
const onSaved = async () => {
  modalOpen.value = false
  await loadCategories()
  await reload()
  emit('changed')
}

watch(visibility, reload)
watch(() => props.createSignal, (v, old) => { if (v !== old) openCreate() })

onMounted(async () => { await loadCategories(); await reload() })
</script>

<style scoped>
.sd-kb { display: grid; grid-template-columns: 248px 1fr; gap: 16px; align-items: start; }
@media (max-width: 760px) { .sd-kb { grid-template-columns: 1fr; } }

/* ─── Left rail ─── */
.sd-kb-rail { display: flex; flex-direction: column; padding: 14px; gap: 10px; position: sticky; top: 8px; }
.sd-kb-rail-head { padding: 2px 4px; }
.sd-kb-rail-title { font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--sd-text-muted); }
.sd-kb-cats { display: flex; flex-direction: column; gap: 4px; }
.sd-kb-cat {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 9px 11px; border-radius: 10px; cursor: pointer; text-align: left;
  background: transparent; border: 1px solid transparent; color: var(--sd-text-secondary);
  font-size: 13px; transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.sd-kb-cat:hover { background: var(--sd-amber-soft); color: var(--sd-text); }
.sd-kb-cat.active { background: var(--sd-amber-soft); border-color: var(--sd-amber-border); color: var(--sd-amber); font-weight: 600; }
.sd-kb-cat-name { display: inline-flex; align-items: center; gap: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sd-kb-cat-count { font-size: 11px; font-weight: 700; color: var(--sd-text-muted); background: var(--sd-surface-glass); padding: 2px 7px; border-radius: 999px; flex-shrink: 0; }
.sd-kb-cat.active .sd-kb-cat-count { color: var(--sd-amber); }
.sd-kb-cat-empty { font-size: 12px; color: var(--sd-text-dim); margin: 4px; }

.sd-kb-add { display: flex; gap: 6px; align-items: center; padding-top: 6px; border-top: 1px solid var(--sd-border); }
.sd-kb-add-toggle {
  display: inline-flex; align-items: center; gap: 6px; width: 100%;
  padding: 8px 11px; border-radius: 10px; cursor: pointer; font-size: 12.5px; font-weight: 600;
  background: transparent; border: 1px dashed var(--sd-border-strong); color: var(--sd-text-muted);
  transition: border-color 0.15s, color 0.15s;
}
.sd-kb-add-toggle:hover { border-color: var(--sd-amber-border); color: var(--sd-amber); }
.sd-kb-add-input {
  flex: 1; min-width: 0; padding: 8px 10px; border-radius: 9px; font-size: 13px; font-family: inherit;
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text);
}
.sd-kb-add-input:focus { outline: none; border-color: var(--sd-amber-border); box-shadow: 0 0 0 3px var(--sd-amber-soft); }
.sd-kb-add-btn {
  width: 32px; height: 32px; flex-shrink: 0; display: grid; place-items: center; border-radius: 9px; cursor: pointer;
  border: none; background: var(--sd-grad-hero); color: #1a1206;
}
[data-theme="light"] .sd-kb-add-btn { color: #fff8ec; }
.sd-kb-add-btn.ghost { background: var(--sd-surface); border: 1px solid var(--sd-border-strong); color: var(--sd-text-muted); }
.sd-kb-add-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.sd-kb-cat-error { font-size: 11.5px; color: var(--sd-danger); margin: 0 4px; }

/* ─── Main ─── */
.sd-kb-main { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.sd-toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.sd-filter { width: 200px; }
.sd-search { flex: 1; min-width: 180px; display: flex; align-items: center; gap: 9px; padding: 10px 14px; border-radius: 12px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text-muted); }
.sd-search input { flex: 1; background: none; border: none; outline: none; color: var(--sd-text); font-size: 14px; }
.sd-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 11px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; background: var(--sd-grad-hero); color: #1a1206; white-space: nowrap; }
[data-theme="light"] .sd-btn-primary { color: #fff8ec; }

.sd-kb-list { display: flex; flex-direction: column; gap: 9px; }
.sd-kb-row { display: flex; align-items: center; gap: 14px; padding: 14px 16px; text-align: left; cursor: pointer; transition: border-color 0.2s var(--sd-spring); }
.sd-kb-row:hover { border-color: var(--sd-amber-border); }
.sd-kb-row-main { flex: 1; min-width: 0; }
.sd-kb-row-title { font-size: 14.5px; font-weight: 600; color: var(--sd-text); margin: 0 0 3px; }
.sd-kb-row-sub { font-size: 12.5px; color: var(--sd-text-muted); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 520px; }
.sd-kb-row-meta { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.sd-kb-row-views { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: var(--sd-text-secondary); }
.sd-kb-row-date { font-size: 11.5px; color: var(--sd-text-dim); }

/* Visibility badge (inline — not in SdPill map) */
.sd-vis-badge {
  font-size: 10px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase;
  padding: 3px 9px; border-radius: 999px;
  color: var(--bc); background: color-mix(in srgb, var(--bc) 13%, transparent);
  border: 1px solid color-mix(in srgb, var(--bc) 32%, transparent);
}
.sd-vis-badge.is-success { --bc: var(--sd-success); }
.sd-vis-badge.is-amber { --bc: var(--sd-amber); }
.sd-vis-badge.is-steel { --bc: var(--sd-steel); }

/* Status badge (small) */
.sd-status-badge {
  font-size: 10px; font-weight: 700; letter-spacing: 0.03em; text-transform: capitalize;
  padding: 3px 9px; border-radius: 999px;
  color: var(--bc); background: color-mix(in srgb, var(--bc) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--bc) 28%, transparent);
}
.sd-status-badge.is-draft { --bc: var(--sd-steel); }
.sd-status-badge.is-published { --bc: var(--sd-success); }
.sd-status-badge.is-archived { --bc: var(--sd-text-dim); }

.sd-empty-state { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 56px 20px; color: var(--sd-text-dim); text-align: center; }
.sd-empty-state p { margin: 0; font-size: 14px; color: var(--sd-text-muted); }

@media (max-width: 640px) { .sd-kb-row-sub, .sd-kb-row-date { display: none; } }
</style>
