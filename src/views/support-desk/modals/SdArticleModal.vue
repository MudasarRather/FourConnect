<template>
  <SdModalShell :open="open" :eyebrow="editing ? 'EDIT ARTICLE' : 'NEW ARTICLE'"
    :title="editing ? (form.title || 'Article') : 'Write a knowledge base article'" width="720px" @close="$emit('close')">
    <form class="sd-form" @submit.prevent="submit">
      <label class="sd-field"><span class="sd-label">Title <em>*</em></span>
        <input v-model="form.title" class="sd-input" placeholder="How to reset your portal password" /></label>

      <div class="sd-grid3">
        <div class="sd-field"><span class="sd-label">Category</span>
          <SdSelect v-model="form.category_id" :options="categoryOpts" placeholder="Uncategorized" /></div>
        <div class="sd-field"><span class="sd-label">Visibility</span>
          <SdSelect v-model="form.visibility" :options="visibilityOpts" placeholder="Visibility" /></div>
        <div class="sd-field"><span class="sd-label">Status</span>
          <SdSelect v-model="form.status" :options="statusOpts" placeholder="Status" /></div>
      </div>

      <label class="sd-field"><span class="sd-label">Short description</span>
        <textarea v-model="form.short_description" rows="2" class="sd-input" placeholder="One-line summary shown in lists & search" /></label>

      <label class="sd-field"><span class="sd-label">Content</span>
        <textarea v-model="form.content" rows="9" class="sd-input sd-input-mono" placeholder="Full article body (Markdown / HTML supported)…" /></label>

      <div class="sd-grid2">
        <label class="sd-field"><span class="sd-label">Tags</span>
          <input v-model="tagsText" class="sd-input" placeholder="setup, billing, faq" />
          <span class="sd-hint">Comma-separated</span></label>
        <label class="sd-field"><span class="sd-label">SEO keywords</span>
          <input v-model="form.seo_keywords" class="sd-input" placeholder="password reset, account access" /></label>
      </div>

      <p v-if="error" class="sd-form-error">{{ error }}</p>
    </form>
    <template #footer>
      <button v-if="editing" class="sd-btn sd-btn-danger" type="button" :disabled="saving" @click="remove">Delete</button>
      <span style="flex:1" />
      <button class="sd-btn" type="button" @click="$emit('close')">Cancel</button>
      <button class="sd-btn sd-btn-primary" type="button" :disabled="saving || !form.title.trim()" @click="submit">
        {{ saving ? 'Saving…' : (editing ? 'Save changes' : 'Create') }}
      </button>
    </template>
  </SdModalShell>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import SdModalShell from '../components/SdModalShell.vue'
import SdSelect from '../components/SdSelect.vue'
import { createArticle, updateArticle, deleteArticle } from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  article: { type: Object, default: null },
  categories: { type: Array, default: () => [] },
  defaultCategoryId: { type: [String, Number], default: null },
})
const emit = defineEmits(['close', 'saved'])

const saving = ref(false)
const error = ref('')
const tagsText = ref('')
const editing = computed(() => !!props.article)

const categoryOpts = computed(() => [
  { value: null, label: 'Uncategorized' },
  ...(props.categories || []).map(c => ({ value: c.id, label: c.name })),
])
const visibilityOpts = [
  { value: 'public', label: 'Public' },
  { value: 'customer', label: 'Customer' },
  { value: 'internal', label: 'Internal' },
]
const statusOpts = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
]

const blank = () => ({
  title: '', category_id: null, visibility: 'internal', status: 'draft',
  short_description: '', content: '', seo_keywords: '',
})
const form = ref(blank())

watch(() => props.open, (v) => {
  if (!v) return
  error.value = ''
  if (props.article) {
    form.value = { ...blank(), ...props.article }
    const t = props.article.tags
    tagsText.value = Array.isArray(t) ? t.join(', ') : (t || '')
  } else {
    form.value = { ...blank(), category_id: props.defaultCategoryId ?? null }
    tagsText.value = ''
  }
})

const submit = async () => {
  if (!form.value.title.trim()) { error.value = 'Title is required.'; return }
  saving.value = true; error.value = ''
  try {
    const payload = { ...form.value }
    payload.tags = tagsText.value.split(',').map(s => s.trim()).filter(Boolean)
    if (editing.value) await updateArticle(props.article.id, payload)
    else await createArticle(payload)
    emit('saved')
  } catch (e) { error.value = e?.response?.data?.detail || 'Save failed.' }
  finally { saving.value = false }
}
const remove = async () => {
  saving.value = true; error.value = ''
  try { await deleteArticle(props.article.id); emit('saved') }
  catch (e) { error.value = e?.response?.data?.detail || 'Delete failed.' }
  finally { saving.value = false }
}
</script>

<style scoped>
.sd-form { display: flex; flex-direction: column; gap: 13px; }
.sd-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
.sd-grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 13px; }
@media (max-width: 560px) { .sd-grid2, .sd-grid3 { grid-template-columns: 1fr; } }
.sd-field { display: flex; flex-direction: column; gap: 6px; }
.sd-label { font-size: 12px; font-weight: 600; color: var(--sd-text-secondary); }
.sd-label em { color: var(--sd-danger); font-style: normal; }
.sd-hint { font-size: 11px; color: var(--sd-text-dim); }
.sd-input { width: 100%; padding: 10px 13px; border-radius: 11px; font-size: 14px; font-family: inherit; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text); resize: vertical; }
.sd-input-mono { font-family: var(--sd-mono); font-size: 13px; line-height: 1.55; }
.sd-input:focus { outline: none; border-color: var(--sd-amber-border); box-shadow: 0 0 0 3px var(--sd-amber-soft); }
.sd-form-error { color: var(--sd-danger); font-size: 12.5px; margin: 0; }
.sd-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 11px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); }
.sd-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.sd-btn-primary { border: none; background: var(--sd-grad-hero); color: #1a1206; }
[data-theme="light"] .sd-btn-primary { color: #fff8ec; }
.sd-btn-danger { color: var(--sd-danger); border-color: color-mix(in srgb, var(--sd-danger) 35%, transparent); }
</style>
