<template>
  <div class="sd-announcements">
    <div class="sd-toolbar">
      <label class="sd-active-filter"><input type="checkbox" v-model="activeOnly" @change="reload" /> Active only</label>
      <span class="sd-toolbar-spacer" />
      <button class="sd-btn sd-btn-primary" @click="openCreate"><Plus :size="15" /> New Announcement</button>
    </div>

    <div v-if="items.length" class="sd-ann-grid">
      <Motion
        v-for="(a, i) in items"
        :key="a.id"
        as="button"
        type="button"
        class="sd-ann-card sd-card"
        :initial="{ opacity: 0, y: 12 }"
        :animate="{ opacity: 1, y: 0 }"
        :while-hover="{ y: -3 }"
        :transition="{ duration: 0.34, delay: Math.min(i * 0.03, 0.3), ease: [0.16, 1, 0.3, 1] }"
        @click="openEdit(a)"
      >
        <div class="sd-ann-top">
          <span class="sd-ann-badge"><Megaphone :size="18" /></span>
          <div class="sd-ann-flags">
            <span class="sd-ann-audience" :class="`aud-${a.audience || 'all'}`">{{ audienceLabel(a.audience) }}</span>
            <span class="sd-ann-state" :class="a.is_active ? 'is-on' : 'is-off'">{{ a.is_active ? 'active' : 'inactive' }}</span>
          </div>
        </div>
        <h3 class="sd-ann-title">{{ a.title }}</h3>
        <p v-if="a.category" class="sd-ann-cat"><Tag :size="12" /> {{ a.category }}</p>
        <p v-if="a.description" class="sd-ann-desc">{{ a.description }}</p>
        <div class="sd-ann-dates">
          <span><CalendarDays :size="13" /> {{ formatDate(a.publish_date) || '—' }}</span>
          <ArrowRight :size="13" class="sd-ann-arrow" />
          <span>{{ formatDate(a.expiry_date) || 'No expiry' }}</span>
        </div>
      </Motion>
    </div>
    <div v-else class="sd-empty-state">
      <Megaphone :size="34" />
      <p>{{ loading ? 'Loading…' : 'No announcements yet.' }}</p>
      <button v-if="!loading" class="sd-btn sd-btn-primary" @click="openCreate"><Plus :size="15" /> Post your first</button>
    </div>

    <SdAnnouncementModal :open="modalOpen" :announcement="editing" @close="modalOpen = false" @saved="onSaved" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { Plus, Megaphone, Tag, CalendarDays, ArrowRight } from 'lucide-vue-next'
import SdAnnouncementModal from '../modals/SdAnnouncementModal.vue'
import { listAnnouncements } from '@/composables/useSupportDesk'

const props = defineProps({
  dashboard: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  createSignal: { type: Number, default: 0 },
})
const emit = defineEmits(['go', 'changed'])

const items = ref([])
const loading = ref(true)
const activeOnly = ref(false)
const modalOpen = ref(false)
const editing = ref(null)

const AUDIENCE = { all: 'All', organization: 'Organization', contract: 'Contract', users: 'Users' }
const audienceLabel = (a) => AUDIENCE[a] || 'All'
const formatDate = (d) => {
  if (!d) return ''
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return String(d).slice(0, 10)
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const reload = async () => {
  loading.value = true
  try {
    const params = {}
    if (activeOnly.value) params.active_only = true
    items.value = await listAnnouncements(params)
  } catch { items.value = [] }
  finally { loading.value = false }
}
const openCreate = () => { editing.value = null; modalOpen.value = true }
const openEdit = (a) => { editing.value = a; modalOpen.value = true }
const onSaved = () => { modalOpen.value = false; reload(); emit('changed') }

watch(() => props.createSignal, () => { if (props.createSignal) openCreate() })
onMounted(reload)
</script>

<style scoped>
.sd-announcements { display: flex; flex-direction: column; gap: 16px; }
.sd-toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.sd-toolbar-spacer { flex: 1; }
.sd-active-filter { display: flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--sd-text-muted); white-space: nowrap; }
.sd-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 11px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; background: var(--sd-grad-hero); color: #1a1206; white-space: nowrap; }
[data-theme="light"] .sd-btn-primary { color: #fff8ec; }

.sd-ann-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.sd-ann-card { padding: 18px; text-align: left; cursor: pointer; transition: border-color 0.2s var(--sd-spring), box-shadow 0.2s var(--sd-spring); display: flex; flex-direction: column; gap: 8px; }
.sd-ann-card:hover { border-color: var(--sd-amber-border); box-shadow: var(--sd-card-shadow); }
.sd-ann-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 4px; }
.sd-ann-badge { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 12px; color: var(--sd-amber); background: var(--sd-amber-soft); flex-shrink: 0; }
.sd-ann-flags { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; }
.sd-ann-audience { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; padding: 3px 8px; border-radius: 6px; color: var(--sd-amber); background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border); }
.sd-ann-audience.aud-all { color: var(--sd-steel); background: var(--sd-steel-soft); border-color: color-mix(in srgb, var(--sd-steel) 30%, transparent); }
.sd-ann-state { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; padding: 3px 8px; border-radius: 6px; }
.sd-ann-state.is-on { color: var(--sd-success); background: var(--sd-success-soft); border: 1px solid color-mix(in srgb, var(--sd-success) 30%, transparent); }
.sd-ann-state.is-off { color: var(--sd-steel); background: var(--sd-steel-soft); border: 1px solid color-mix(in srgb, var(--sd-steel) 30%, transparent); }
.sd-ann-title { font-size: 16px; font-weight: 700; color: var(--sd-text); margin: 0; line-height: 1.3; }
.sd-ann-cat { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 600; color: var(--sd-text-muted); margin: 0; }
.sd-ann-desc { font-size: 12.5px; color: var(--sd-text-secondary); margin: 0; line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.sd-ann-dates { display: flex; align-items: center; gap: 8px; margin-top: auto; padding-top: 6px; }
.sd-ann-dates span { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--sd-text-muted); }
.sd-ann-arrow { color: var(--sd-text-dim); flex-shrink: 0; }

.sd-empty-state { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 56px 20px; color: var(--sd-text-dim); text-align: center; }
.sd-empty-state p { margin: 0; font-size: 14px; color: var(--sd-text-muted); }

@media (prefers-reduced-motion: reduce) {
  .sd-ann-card { transition: none !important; }
}
</style>
