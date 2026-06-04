<template>
  <div class="edoc-section">
    <div class="edoc-toolbar">
      <div class="vq-title">
        <ClipboardCheck :size="16" />
        <span>Verification Queue</span>
        <span class="vq-count edoc-mono">{{ api.total.value }}</span>
      </div>
      <EdocEmployeeFilter v-model="api.filters.value.employee_id" @update:modelValue="reload" />
      <div style="flex:1" />
      <button v-if="selected.size" class="edoc-btn" @click="clearSel">Clear ({{ selected.size }})</button>
      <Motion v-if="selected.size" as="button" class="edoc-btn edoc-btn-success"
        :whileHover="{ y:-2 }" :whileTap="{ scale:0.96 }" :disabled="busy" @click="verifySelected">
        <Loader2 v-if="busy" :size="14" class="spin" /><CheckCircle2 v-else :size="14" /> Verify selected
      </Motion>
    </div>

    <div v-if="api.loading.value" class="doc-grid">
      <div v-for="i in 6" :key="i" class="edoc-skel" style="height:168px" />
    </div>
    <EdocEmptyState v-else-if="!api.items.value.length" :icon="ClipboardCheck"
      title="Queue is clear" body="No documents are waiting for verification right now." />
    <div v-else class="doc-grid">
      <EdocDocumentCard
        v-for="(doc, i) in api.items.value" :key="doc.id" :doc="doc" :index="i"
        selectable :selected="selected.has(doc.id)"
        @open="openDoc" @toggle="toggle"
      />
    </div>

    <EdocDocumentDrawer :open="drawer.open" :doc-id="drawer.id" @close="drawer.open = false" @changed="reload" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { ClipboardCheck, CheckCircle2, Loader2 } from 'lucide-vue-next'
import EdocDocumentCard from '../components/EdocDocumentCard.vue'
import EdocEmptyState from '../components/EdocEmptyState.vue'
import EdocEmployeeFilter from '../components/EdocEmployeeFilter.vue'
import EdocDocumentDrawer from '../drawers/EdocDocumentDrawer.vue'
import { useEmployeeDocuments } from '@/composables/useEmployeeDocuments'
import { useToast } from '@/composables/useToast'

const emit = defineEmits(['refresh-counts'])
const api = useEmployeeDocuments()
const { success, error } = useToast()
const selected = ref(new Set())
const busy = ref(false)
const drawer = ref({ open: false, id: null })

const reload = async () => { selected.value = new Set(); await api.fetchQueue(1, 50); emit('refresh-counts') }
const openDoc = (d) => { drawer.value = { open: true, id: d.id } }
const toggle = (d) => { const s = new Set(selected.value); s.has(d.id) ? s.delete(d.id) : s.add(d.id); selected.value = s }
const clearSel = () => { selected.value = new Set() }
const verifySelected = async () => {
  busy.value = true
  try {
    const res = await api.bulk([...selected.value], 'verify')
    success(`Verified ${res.processed} document(s)`)
    await reload()
  } catch (e) { error(e?.response?.data?.detail || 'Bulk verify failed') }
  finally { busy.value = false }
}
onMounted(reload)
</script>

<style scoped>
.vq-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: var(--hr-text); }
.vq-count { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: var(--hr-accent-gold-soft); color: var(--hr-accent-gold); }
.doc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(248px, 1fr)); gap: 14px; }
.spin { animation: edoc-ring-rotate 1s linear infinite; }
[data-theme="light"] .vq-title { color: #1a1410; }
</style>
