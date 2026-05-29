<template>
  <div class="edoc-section">
    <div class="edoc-toolbar">
      <div class="vq-title"><Archive :size="16" /> <span>Archived Documents</span></div>
      <div class="edoc-search">
        <Search :size="14" class="ic" />
        <input v-model="api.filters.value.q" placeholder="Search archived…" @keyup.enter="reload" />
      </div>
    </div>

    <div v-if="api.loading.value" class="doc-grid">
      <div v-for="i in 6" :key="i" class="edoc-skel" style="height:168px" />
    </div>
    <EdocEmptyState v-else-if="!api.items.value.length" :icon="Archive"
      title="Archive is empty" body="Archived documents are kept for audit and can be restored anytime." />
    <div v-else class="doc-grid">
      <EdocDocumentCard v-for="(doc, i) in api.items.value" :key="doc.id" :doc="doc" :index="i" @open="openDoc" />
    </div>

    <EdocDocumentDrawer :open="drawer.open" :doc-id="drawer.id" @close="drawer.open = false" @changed="reload" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Archive, Search } from 'lucide-vue-next'
import EdocDocumentCard from '../components/EdocDocumentCard.vue'
import EdocEmptyState from '../components/EdocEmptyState.vue'
import EdocDocumentDrawer from '../drawers/EdocDocumentDrawer.vue'
import { useEmployeeDocuments } from '@/composables/useEmployeeDocuments'

const api = useEmployeeDocuments()
const drawer = ref({ open: false, id: null })
const reload = () => api.fetchList()
const openDoc = (d) => { drawer.value = { open: true, id: d.id } }
onMounted(() => { api.setFilters({ archived: true, status: null, category: null, limit: 24 }); reload() })
</script>

<style scoped>
.vq-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: var(--hr-text); white-space: nowrap; }
.doc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(248px, 1fr)); gap: 14px; }
[data-theme="light"] .vq-title { color: #1a1410; }
</style>
