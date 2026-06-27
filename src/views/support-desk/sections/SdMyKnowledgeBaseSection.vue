<template>
  <div class="sd-kb">
    <div class="sd-toolbar">
      <div class="sd-search"><Search :size="15" /><input v-model="q" placeholder="Search the knowledge base…" @keyup.enter="reload" /></div>
    </div>

    <div class="sd-kb-grid">
      <aside class="sd-kb-rail sd-card">
        <button class="sd-kb-cat" :class="{ active: !catId }" @click="selectCat(null)">All articles<span>{{ totalArticles }}</span></button>
        <button v-for="c in cats" :key="c.id" class="sd-kb-cat" :class="{ active: catId === c.id }" @click="selectCat(c.id)">
          {{ c.name }}<span>{{ c.article_count ?? 0 }}</span>
        </button>
      </aside>

      <div class="sd-kb-main">
        <div v-if="articles.length" class="sd-kb-list">
          <Motion
            v-for="(a, i) in articles" :key="a.id"
            as="button" type="button" class="sd-kb-card sd-card"
            :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.3, delay: Math.min(i * 0.03, 0.3), ease: [0.16, 1, 0.3, 1] }"
            @click="open(a)"
          >
            <span class="sd-kb-ico"><FileText :size="18" /></span>
            <div class="sd-kb-card-body">
              <p class="sd-kb-title">{{ a.title }}</p>
              <p class="sd-kb-desc">{{ a.short_description || 'Read more…' }}</p>
            </div>
            <span class="sd-kb-views"><Eye :size="12" /> {{ a.views ?? 0 }}</span>
          </Motion>
        </div>
        <div v-else class="sd-empty-state"><BookOpen :size="34" /><p>{{ loadingList ? 'Loading…' : 'No articles found.' }}</p></div>
      </div>
    </div>

    <SdModalShell :open="!!reading" eyebrow="KNOWLEDGE BASE" :title="reading?.title || ''" width="720px" @close="reading = null">
      <article v-if="reading" class="sd-article">
        <p v-if="reading.short_description" class="sd-article-lede">{{ reading.short_description }}</p>
        <div class="sd-article-body" v-text="reading.content || 'No content.'" />
      </article>
    </SdModalShell>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { Search, FileText, Eye, BookOpen } from 'lucide-vue-next'
import SdModalShell from '../components/SdModalShell.vue'
import { listMyKb, listMyKbCategories, getMyArticle } from '@/composables/useSupportDesk'

defineProps({ dashboard: { type: Object, default: null }, loading: { type: Boolean, default: false }, createSignal: { type: Number, default: 0 } })
defineEmits(['go', 'changed'])

const cats = ref([]); const articles = ref([]); const catId = ref(null); const q = ref('')
const loadingList = ref(true); const reading = ref(null)
const totalArticles = computed(() => cats.value.reduce((a, c) => a + (c.article_count || 0), 0))

const reload = async () => {
  loadingList.value = true
  try {
    const params = {}
    if (catId.value) params.category_id = catId.value
    if (q.value.trim()) params.q = q.value.trim()
    articles.value = await listMyKb(params)
  } catch { articles.value = [] } finally { loadingList.value = false }
}
const selectCat = (id) => { catId.value = id; reload() }
const open = async (a) => {
  reading.value = a
  try { reading.value = await getMyArticle(a.id) } catch { /* keep summary */ }
}
onMounted(async () => {
  try { cats.value = await listMyKbCategories() } catch { cats.value = [] }
  reload()
})
</script>

<style scoped>
.sd-kb { display: flex; flex-direction: column; gap: 14px; }
.sd-toolbar { display: flex; gap: 10px; }
.sd-search { flex: 1; display: flex; align-items: center; gap: 9px; padding: 10px 14px; border-radius: 12px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text-muted); }
.sd-search input { flex: 1; background: none; border: none; outline: none; color: var(--sd-text); font-size: 14px; }
.sd-kb-grid { display: grid; grid-template-columns: 220px 1fr; gap: 16px; }
@media (max-width: 700px) { .sd-kb-grid { grid-template-columns: 1fr; } }
.sd-kb-rail { padding: 10px; display: flex; flex-direction: column; gap: 4px; align-self: start; }
.sd-kb-cat { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px; border-radius: 10px; border: none; background: transparent; color: var(--sd-text-secondary); font-size: 13px; font-weight: 500; cursor: pointer; text-align: left; }
.sd-kb-cat:hover { background: var(--sd-surface-glass); color: var(--sd-text); }
.sd-kb-cat.active { background: var(--sd-amber-soft); color: var(--sd-amber); font-weight: 600; }
.sd-kb-cat span { font-size: 11px; opacity: 0.7; }
.sd-kb-list { display: flex; flex-direction: column; gap: 9px; }
.sd-kb-card { display: flex; align-items: center; gap: 14px; padding: 14px 16px; cursor: pointer; text-align: left; }
.sd-kb-card:hover { border-color: var(--sd-amber-border); }
.sd-kb-ico { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 11px; color: var(--sd-amber); background: var(--sd-amber-soft); flex-shrink: 0; }
.sd-kb-card-body { flex: 1; min-width: 0; }
.sd-kb-title { font-size: 14.5px; font-weight: 600; color: var(--sd-text); margin: 0 0 3px; }
.sd-kb-desc { font-size: 12.5px; color: var(--sd-text-muted); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sd-kb-views { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; color: var(--sd-text-dim); flex-shrink: 0; }
.sd-empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 48px 20px; color: var(--sd-text-dim); }
.sd-empty-state p { margin: 0; font-size: 14px; color: var(--sd-text-muted); }
.sd-article-lede { font-size: 15px; color: var(--sd-text-secondary); margin: 0 0 16px; font-weight: 500; }
.sd-article-body { font-size: 14px; color: var(--sd-text); line-height: 1.65; white-space: pre-wrap; }
</style>
