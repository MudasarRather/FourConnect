<template>
  <div class="edoc-section">
    <div class="edoc-toolbar">
      <div class="vq-title"><CalendarClock :size="16" /> <span>Expiry Tracking</span></div>
      <div style="flex:1" />
      <div class="status-pills">
        <button v-for="w in WINDOWS" :key="w" class="edoc-pill" :class="{ 'is-active': within === w }" @click="setWindow(w)">{{ w }}d</button>
      </div>
    </div>

    <div v-if="api.loading.value" class="doc-grid">
      <div v-for="i in 6" :key="i" class="edoc-skel" style="height:168px" />
    </div>
    <EdocEmptyState v-else-if="!api.items.value.length" :icon="CalendarClock"
      title="Nothing expiring" :body="`No documents expire within the next ${within} days.`" />

    <template v-else>
      <div v-for="b in buckets" :key="b.key" v-show="b.items.length" class="bucket">
        <div class="bucket-head" :class="b.cls">
          <span class="b-dot" /> {{ b.label }}
          <span class="b-count edoc-mono">{{ b.items.length }}</span>
        </div>
        <div class="doc-grid">
          <EdocDocumentCard v-for="(doc, i) in b.items" :key="doc.id" :doc="doc" :index="i" @open="openDoc" />
        </div>
      </div>
    </template>

    <EdocDocumentDrawer :open="drawer.open" :doc-id="drawer.id" @close="drawer.open = false" @changed="reload" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { CalendarClock } from 'lucide-vue-next'
import EdocDocumentCard from '../components/EdocDocumentCard.vue'
import EdocEmptyState from '../components/EdocEmptyState.vue'
import EdocDocumentDrawer from '../drawers/EdocDocumentDrawer.vue'
import { useEmployeeDocuments } from '@/composables/useEmployeeDocuments'

const WINDOWS = [30, 60, 90]
const api = useEmployeeDocuments()
const within = ref(90)
const drawer = ref({ open: false, id: null })

const buckets = computed(() => {
  const groups = [
    { key: 'expired', label: 'Expired', cls: 'is-expired', items: [] },
    { key: 's30', label: 'Within 30 days', cls: 'is-soon', items: [] },
    { key: 's60', label: '31–60 days', cls: 'is-watch', items: [] },
    { key: 's90', label: '61–90 days', cls: 'is-ok', items: [] },
  ]
  for (const d of api.items.value) {
    const x = d.days_to_expiry
    if (x == null) continue
    if (x < 0) groups[0].items.push(d)
    else if (x <= 30) groups[1].items.push(d)
    else if (x <= 60) groups[2].items.push(d)
    else groups[3].items.push(d)
  }
  return groups
})

const reload = () => api.fetchExpiring(within.value)
const setWindow = (w) => { within.value = w; reload() }
const openDoc = (d) => { drawer.value = { open: true, id: d.id } }
onMounted(reload)
</script>

<style scoped>
.vq-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: var(--hr-text); }
.status-pills { display: flex; gap: 6px; }
.doc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(248px, 1fr)); gap: 14px; }
.bucket { display: flex; flex-direction: column; gap: 10px; margin-bottom: 6px; }
.bucket-head { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--hr-text-secondary); }
.b-dot { width: 8px; height: 8px; border-radius: 50%; }
.bucket-head.is-expired .b-dot { background: var(--edoc-expired); box-shadow: 0 0 8px var(--edoc-expired); }
.bucket-head.is-soon .b-dot { background: var(--hr-orange); box-shadow: 0 0 8px var(--hr-orange); }
.bucket-head.is-watch .b-dot { background: var(--hr-accent-gold); box-shadow: 0 0 8px var(--hr-accent-gold); }
.bucket-head.is-ok .b-dot { background: var(--hr-text-muted); }
.b-count { font-size: 11px; padding: 1px 7px; border-radius: 999px; background: rgba(255,255,255,0.06); color: var(--hr-text-secondary); }
[data-theme="light"] .vq-title { color: #1a1410; }
[data-theme="light"] .b-count { background: rgba(40,25,10,0.08); color: #6b5840; }
</style>
