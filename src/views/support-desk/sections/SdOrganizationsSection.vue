<template>
  <div class="sd-orgs">
    <div class="sd-toolbar">
      <div class="sd-search">
        <Search :size="15" />
        <input v-model="q" type="text" placeholder="Search organizations…" @keyup.enter="reload" />
      </div>
      <label class="sd-inactive"><input type="checkbox" v-model="includeInactive" @change="reload" /> Show inactive</label>
      <button class="sd-btn sd-btn-primary" @click="openCreate"><Plus :size="15" /> Add Organization</button>
    </div>

    <div v-if="orgs.length" class="sd-org-grid">
      <Motion
        v-for="(o, i) in orgs"
        :key="o.id"
        as="button"
        type="button"
        class="sd-org-card sd-card"
        :initial="{ opacity: 0, y: 12 }"
        :animate="{ opacity: 1, y: 0 }"
        :while-hover="{ y: -3 }"
        :transition="{ duration: 0.34, delay: Math.min(i * 0.03, 0.3), ease: [0.16, 1, 0.3, 1] }"
        @click="openEdit(o)"
      >
        <div class="sd-org-top">
          <span class="sd-org-badge"><Building2 :size="18" /></span>
          <span v-if="!o.is_active" class="sd-org-inactive">inactive</span>
        </div>
        <h3 class="sd-org-name">{{ o.name }}</h3>
        <p class="sd-org-sub">
          <span v-if="o.code" class="sd-mono">{{ o.code }}</span>
          <span v-if="o.industry"> · {{ o.industry }}</span>
        </p>
        <div class="sd-org-stats">
          <span><Users :size="13" /> {{ o.customer_count ?? 0 }} contacts</span>
          <span><Ticket :size="13" /> {{ o.open_ticket_count ?? 0 }} open</span>
        </div>
      </Motion>
    </div>
    <div v-else class="sd-empty-state">
      <Building2 :size="34" />
      <p>{{ loading ? 'Loading…' : 'No organizations yet.' }}</p>
      <button v-if="!loading" class="sd-btn sd-btn-primary" @click="openCreate"><Plus :size="15" /> Add your first</button>
    </div>

    <SdOrgModal :open="modalOpen" :org="editing" @close="modalOpen = false" @saved="onSaved" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { Search, Plus, Building2, Users, Ticket } from 'lucide-vue-next'
import SdOrgModal from '../modals/SdOrgModal.vue'
import { listOrganizations } from '@/composables/useSupportDesk'

const emit = defineEmits(['go', 'changed'])

const orgs = ref([])
const loading = ref(true)
const q = ref('')
const includeInactive = ref(false)
const modalOpen = ref(false)
const editing = ref(null)

const reload = async () => {
  loading.value = true
  try {
    const params = {}
    if (q.value.trim()) params.q = q.value.trim()
    if (includeInactive.value) params.include_inactive = true
    orgs.value = await listOrganizations(params)
  } catch { orgs.value = [] }
  finally { loading.value = false }
}
const openCreate = () => { editing.value = null; modalOpen.value = true }
const openEdit = (o) => { editing.value = o; modalOpen.value = true }
const onSaved = () => { modalOpen.value = false; reload(); emit('changed') }

onMounted(reload)
</script>

<style scoped>
.sd-orgs { display: flex; flex-direction: column; gap: 16px; }
.sd-toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.sd-search { flex: 1; min-width: 200px; display: flex; align-items: center; gap: 9px; padding: 10px 14px; border-radius: 12px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text-muted); }
.sd-search input { flex: 1; background: none; border: none; outline: none; color: var(--sd-text); font-size: 14px; }
.sd-inactive { display: flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--sd-text-muted); white-space: nowrap; }
.sd-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 11px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; background: var(--sd-grad-hero); color: #1a1206; white-space: nowrap; }
[data-theme="light"] .sd-btn-primary { color: #fff8ec; }

.sd-org-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
.sd-org-card { padding: 18px; text-align: left; cursor: pointer; transition: border-color 0.2s var(--sd-spring), box-shadow 0.2s var(--sd-spring); }
.sd-org-card:hover { border-color: var(--sd-amber-border); box-shadow: var(--sd-card-shadow); }
.sd-org-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.sd-org-badge { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 12px; color: var(--sd-amber); background: var(--sd-amber-soft); }
.sd-org-inactive { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--sd-steel); padding: 3px 8px; border-radius: 6px; background: var(--sd-steel-soft); }
.sd-org-name { font-size: 16px; font-weight: 700; color: var(--sd-text); margin: 0 0 4px; }
.sd-org-sub { font-size: 12px; color: var(--sd-text-muted); margin: 0 0 14px; }
.sd-org-stats { display: flex; gap: 16px; }
.sd-org-stats span { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: var(--sd-text-secondary); }

.sd-empty-state { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 56px 20px; color: var(--sd-text-dim); text-align: center; }
.sd-empty-state p { margin: 0; font-size: 14px; color: var(--sd-text-muted); }
</style>
