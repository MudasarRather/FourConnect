<template>
  <div class="sd-customers">
    <div class="sd-toolbar">
      <div class="sd-filter"><SdSelect v-model="orgFilter" :options="orgFilterOpts" placeholder="All organizations" /></div>
      <div class="sd-search">
        <Search :size="15" />
        <input v-model="q" type="text" placeholder="Search contacts…" @keyup.enter="reload" />
      </div>
      <button class="sd-btn sd-btn-primary" @click="openCreate"><Plus :size="15" /> Add Contact</button>
    </div>

    <div v-if="customers.length" class="sd-cust-list">
      <Motion
        v-for="(c, i) in customers"
        :key="c.id"
        as="button"
        type="button"
        class="sd-cust-row sd-card"
        :initial="{ opacity: 0, y: 10 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.3, delay: Math.min(i * 0.025, 0.3), ease: [0.16, 1, 0.3, 1] }"
        @click="openEdit(c)"
      >
        <span class="sd-cust-avatar">{{ initials(c.name) }}</span>
        <div class="sd-cust-main">
          <p class="sd-cust-name">{{ c.name }} <span v-if="!c.is_active" class="sd-tag">inactive</span></p>
          <p class="sd-cust-sub">{{ [c.designation, c.organization_name].filter(Boolean).join(' · ') || '—' }}</p>
        </div>
        <div class="sd-cust-contact">
          <span v-if="c.email"><Mail :size="13" /> {{ c.email }}</span>
          <span v-if="c.phone"><Phone :size="13" /> {{ c.phone }}</span>
        </div>
      </Motion>
    </div>
    <div v-else class="sd-empty-state">
      <Users :size="34" />
      <p>{{ loading ? 'Loading…' : 'No contacts yet.' }}</p>
      <button v-if="!loading" class="sd-btn sd-btn-primary" @click="openCreate"><Plus :size="15" /> Add a contact</button>
    </div>

    <SdCustomerModal :open="modalOpen" :customer="editing" :default-org-id="orgFilter" @close="modalOpen = false" @saved="onSaved" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { Search, Plus, Users, Mail, Phone } from 'lucide-vue-next'
import SdSelect from '../components/SdSelect.vue'
import SdCustomerModal from '../modals/SdCustomerModal.vue'
import { listCustomers, loadPickers, usePickers } from '@/composables/useSupportDesk'

const emit = defineEmits(['go', 'changed'])

const pickers = usePickers()
const customers = ref([])
const loading = ref(true)
const q = ref('')
const orgFilter = ref(null)
const modalOpen = ref(false)
const editing = ref(null)

const orgFilterOpts = computed(() => [{ value: null, label: 'All organizations' }, ...(pickers.organizations || []).map(o => ({ value: o.id, label: o.name }))])

const reload = async () => {
  loading.value = true
  try {
    const params = {}
    if (q.value.trim()) params.q = q.value.trim()
    if (orgFilter.value) params.organization_id = orgFilter.value
    customers.value = await listCustomers(params)
  } catch { customers.value = [] }
  finally { loading.value = false }
}
const openCreate = () => { editing.value = null; modalOpen.value = true }
const openEdit = (c) => { editing.value = c; modalOpen.value = true }
const onSaved = () => { modalOpen.value = false; reload(); emit('changed') }
const initials = (n) => (n || '?').split(' ').map(x => x[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()

watch(orgFilter, reload)
onMounted(() => { loadPickers(); reload() })
</script>

<style scoped>
.sd-customers { display: flex; flex-direction: column; gap: 16px; }
.sd-toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.sd-filter { width: 220px; }
.sd-search { flex: 1; min-width: 180px; display: flex; align-items: center; gap: 9px; padding: 10px 14px; border-radius: 12px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text-muted); }
.sd-search input { flex: 1; background: none; border: none; outline: none; color: var(--sd-text); font-size: 14px; }
.sd-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 11px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; background: var(--sd-grad-hero); color: #1a1206; white-space: nowrap; }
[data-theme="light"] .sd-btn-primary { color: #fff8ec; }

.sd-cust-list { display: flex; flex-direction: column; gap: 9px; }
.sd-cust-row { display: flex; align-items: center; gap: 14px; padding: 13px 16px; text-align: left; cursor: pointer; transition: border-color 0.2s var(--sd-spring); }
.sd-cust-row:hover { border-color: var(--sd-amber-border); }
.sd-cust-avatar { width: 40px; height: 40px; border-radius: 11px; display: grid; place-items: center; font-size: 13px; font-weight: 800; color: var(--sd-amber); background: var(--sd-amber-soft); flex-shrink: 0; }
.sd-cust-main { flex: 1; min-width: 0; }
.sd-cust-name { font-size: 14.5px; font-weight: 600; color: var(--sd-text); margin: 0 0 3px; }
.sd-tag { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--sd-steel); padding: 2px 6px; border-radius: 5px; background: var(--sd-steel-soft); margin-left: 6px; }
.sd-cust-sub { font-size: 12.5px; color: var(--sd-text-muted); margin: 0; }
.sd-cust-contact { display: flex; flex-direction: column; gap: 4px; align-items: flex-end; flex-shrink: 0; }
.sd-cust-contact span { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--sd-text-secondary); }

.sd-empty-state { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 56px 20px; color: var(--sd-text-dim); text-align: center; }
.sd-empty-state p { margin: 0; font-size: 14px; color: var(--sd-text-muted); }
@media (max-width: 640px) { .sd-cust-contact { display: none; } }
</style>
