<template>
  <div class="edoc-section">
    <div class="edoc-toolbar">
      <div class="edoc-search">
        <Search :size="14" class="ic" />
        <input v-model="api.filters.value.q" placeholder="Search title or type…" @keyup.enter="reload" />
      </div>
      <div class="status-pills">
        <button v-for="s in STATUS" :key="s.key" class="edoc-pill" :class="{ 'is-active': api.filters.value.status === s.key }" @click="setStatus(s.key)">
          {{ s.label }}
        </button>
      </div>
      <button class="edoc-btn edoc-btn-primary" @click="upload.open = true"><Plus :size="15" /> Add Document</button>
    </div>

    <div v-if="api.loading.value" class="doc-grid">
      <div v-for="i in 8" :key="i" class="edoc-skel" style="height:168px" />
    </div>

    <EdocEmptyState
      v-else-if="!api.items.value.length"
      :icon="catIcon"
      :title="`No ${label.toLowerCase()} yet`"
      :body="`Upload an employee's ${label.toLowerCase()} to start tracking verification and expiry.`"
      cta-label="Add Document"
      :cta-icon="Plus"
      @cta="upload.open = true"
    />

    <div v-else class="doc-grid">
      <EdocDocumentCard
        v-for="(doc, i) in api.items.value" :key="doc.id" :doc="doc" :index="i"
        @open="openDoc"
      />
    </div>

    <div v-if="!api.loading.value && api.total.value > api.filters.value.limit" class="edoc-pager">
      <span class="edoc-mono">Page {{ api.filters.value.page }} / {{ api.totalPages.value }} · {{ api.total.value }} docs</span>
      <div class="pg">
        <button class="edoc-btn edoc-btn-sm" :disabled="api.filters.value.page <= 1" @click="go(api.filters.value.page - 1)"><ChevronLeft :size="14" /></button>
        <button class="edoc-btn edoc-btn-sm" :disabled="api.filters.value.page >= api.totalPages.value" @click="go(api.filters.value.page + 1)"><ChevronRight :size="14" /></button>
      </div>
    </div>

    <EdocDocumentDrawer :open="drawer.open" :doc-id="drawer.id" @close="drawer.open = false" @changed="reload" />
    <EdocUploadModal :open="upload.open" :preset-category="category" @close="upload.open = false" @created="reload" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Search, Plus, ChevronLeft, ChevronRight, IdCard, FileSignature, Award, ReceiptIndianRupee, ScrollText, Fingerprint, GraduationCap, ShieldCheck, FileText } from 'lucide-vue-next'
import EdocDocumentCard from '../components/EdocDocumentCard.vue'
import EdocEmptyState from '../components/EdocEmptyState.vue'
import EdocDocumentDrawer from '../drawers/EdocDocumentDrawer.vue'
import EdocUploadModal from '../modals/EdocUploadModal.vue'
import { useEmployeeDocuments, DOC_CATEGORIES } from '@/composables/useEmployeeDocuments'

const props = defineProps({ category: { type: String, required: true } })
const emit = defineEmits(['refresh-counts'])

const STATUS = [
  { key: null, label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'VERIFIED', label: 'Verified' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'EXPIRED', label: 'Expired' },
]
const CAT_ICON = { KYC: IdCard, CONTRACT: FileSignature, CERTIFICATE: Award, SALARY_SLIP: ReceiptIndianRupee, EXPERIENCE_LETTER: ScrollText, ID_PROOF: Fingerprint, EDUCATION: GraduationCap, COMPLIANCE: ShieldCheck }
const catIcon = computed(() => CAT_ICON[props.category] || FileText)
const label = computed(() => DOC_CATEGORIES.find(c => c.key === props.category)?.label || 'Documents')

const api = useEmployeeDocuments()
const drawer = ref({ open: false, id: null })
const upload = ref({ open: false })

const reload = async () => { await api.fetchList(); emit('refresh-counts') }
const setStatus = (s) => { api.setFilters({ status: s }); reload() }
const go = (p) => { api.setPage(p); reload() }
const openDoc = (doc) => { drawer.value = { open: true, id: doc.id } }

const init = () => { api.setFilters({ category: props.category, status: null, q: '', limit: 24 }); reload() }
watch(() => props.category, init)
onMounted(init)
</script>

<style scoped>
.status-pills { display: flex; gap: 6px; flex-wrap: wrap; }
.doc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(248px, 1fr)); gap: 14px; align-items: stretch; }
.edoc-pager { display: flex; align-items: center; justify-content: space-between; padding: 4px 2px; font-size: 12px; color: var(--hr-text-muted); }
.pg { display: flex; gap: 6px; }
[data-theme="light"] .edoc-pager { color: #6b5840; }
</style>
