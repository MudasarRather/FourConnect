<template>
  <div class="trn-sec">
    <!-- cinematic loading -->
    <div v-if="loading" class="cs-loading">
      <div class="trn-skel" style="height: 300px; border-radius: 24px;" />
      <div class="cs-grid">
        <div v-for="n in 6" :key="n" class="trn-skel" style="height: 220px; border-radius: 18px;" />
      </div>
    </div>

    <template v-else>
      <!-- ── command deck ── -->
      <CertVaultHero
        v-model:search="search" v-model:statusFilter="statusFilter"
        :counts="statusCounts" @manage="catalogOpen = true" @award="openCreate" />

      <!-- ── linked surfaces ── -->
      <div class="cs-links">
        <span class="cs-links-lab trn-mono"><Workflow :size="12" /> Linked surfaces</span>
        <Motion v-for="(l, i) in linkChips" :key="l.key" as="button" type="button" class="cs-chip"
          :style="{ '--c': l.color }"
          :initial="reduced ? false : { opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.4, delay: 0.1 + i * 0.06, ease: [0.16, 1, 0.3, 1] }"
          :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="l.run">
          <component :is="l.icon" :size="14" /> {{ l.label }}
          <ArrowUpRight :size="13" class="cs-chip-arrow" />
        </Motion>
      </div>

      <!-- ── grid ── -->
      <TrnEmptyState v-if="!filtered.length" :icon="Award" title="No certifications yet"
        :sub="search || statusFilter ? 'No credentials match your filters.' : 'Award the first credential to an employee to start tracking expiry &amp; renewals.'">
        <button v-if="!search && !statusFilter" class="trn-btn trn-btn-primary" @click="openCreate" style="margin-top:14px">
          <Plus :size="15" /> Award certification
        </button>
      </TrnEmptyState>

      <div v-else class="cs-grid">
        <CertCredentialCard v-for="(c, i) in filtered" :key="c.id" :cert="c" :index="i"
          :renewing="renewing === c.id"
          @view="openDetail(c)" @edit="openEdit(c)" @renew="renew(c)" @delete="confirmDelete(c)" />
      </div>
    </template>

    <CertificationFormModal :open="modalOpen" :cert="editing" @close="modalOpen = false" @saved="onSaved" />
    <CertCatalogModal :open="catalogOpen" @close="catalogOpen = false" @saved="load" />
    <CertificationDetailDrawer :open="drawerOpen" :cert="viewing"
      @close="drawerOpen = false" @edit="openEdit" @renew="renew" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import { Plus, Award, Workflow, CalendarClock, UsersRound, Library, ArrowUpRight } from 'lucide-vue-next'
import TrnEmptyState from '../components/TrnEmptyState.vue'
import CertVaultHero from '../components/CertVaultHero.vue'
import CertCredentialCard from '../components/CertCredentialCard.vue'
import CertificationFormModal from '../modals/CertificationFormModal.vue'
import CertCatalogModal from '../modals/CertCatalogModal.vue'
import CertificationDetailDrawer from '../drawers/CertificationDetailDrawer.vue'
import {
  fetchEmployeeCertifications, deleteEmployeeCertification,
  renewEmployeeCertification,
} from '@/composables/useTraining'
import { prefersReduced } from '@/composables/useShiftMotion'

const emit = defineEmits(['refresh-stats', 'go'])
const toast = useToast()
const reduced = prefersReduced()

const rows = ref([])
const loading = ref(true)
const search = ref('')
const statusFilter = ref('')
const renewing = ref(null)

const modalOpen = ref(false)
const catalogOpen = ref(false)
const editing = ref(null)
const drawerOpen = ref(false)
const viewing = ref(null)

const filtered = computed(() => {
  let r = rows.value
  if (statusFilter.value) r = r.filter(c => c.status === statusFilter.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    r = r.filter(c =>
      (c.employee_name || '').toLowerCase().includes(q) ||
      (c.name || '').toLowerCase().includes(q) ||
      (c.issuing_authority || '').toLowerCase().includes(q))
  }
  return r
})

const statusCounts = computed(() => {
  const c = { ACTIVE: 0, EXPIRING_SOON: 0, EXPIRED: 0, PENDING_RENEWAL: 0, REVOKED: 0 }
  for (const row of rows.value) if (c[row.status] !== undefined) c[row.status]++
  return c
})

const linkChips = computed(() => [
  { key: 'expiry', label: 'Expiry radar', icon: CalendarClock, color: 'var(--trn-cert-expiring)', run: () => emit('go', 'certification-expiry') },
  { key: 'enroll', label: 'Renewal enrollments', icon: UsersRound, color: 'var(--trn-amber)', run: () => emit('go', 'enrollment') },
  { key: 'catalog', label: 'Credential catalog', icon: Library, color: 'var(--trn-cert-active)', run: () => { catalogOpen.value = true } },
])

const load = async () => {
  loading.value = true
  try { rows.value = await fetchEmployeeCertifications() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load certifications') }
  finally { loading.value = false }
}
onMounted(load)

const openCreate = () => { editing.value = null; modalOpen.value = true }
const openEdit = (c) => { drawerOpen.value = false; editing.value = c; modalOpen.value = true }
const openDetail = (c) => { viewing.value = c; drawerOpen.value = true }
const onSaved = () => { load(); emit('refresh-stats') }

const renew = async (c) => {
  if (renewing.value) return
  renewing.value = c.id
  try {
    const res = await renewEmployeeCertification(c.id)
    toast.success(res?.renewal_program_name
      ? `Renewal started — ${c.employee_name} enrolled in ${res.renewal_program_name}`
      : `Renewal started for ${c.name}`)
    drawerOpen.value = false
    await load()
    emit('refresh-stats')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not renew certification')
  } finally {
    renewing.value = null
  }
}

const confirmDelete = async (c) => {
  if (!confirm(`Delete the "${c.name}" certification held by ${c.employee_name || 'this employee'}?`)) return
  try {
    await deleteEmployeeCertification(c.id)
    toast.success('Certification deleted')
    load(); emit('refresh-stats')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not delete certification')
  }
}
</script>

<style scoped>
.trn-sec { display: flex; flex-direction: column; gap: 16px; }
.cs-loading { display: flex; flex-direction: column; gap: 16px; }
.cs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 13px; }

/* linked surfaces */
.cs-links { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.cs-links-lab { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--trn-text-dim); margin-right: 2px; }
.cs-chip { display: inline-flex; align-items: center; gap: 7px; font: inherit; font-size: 12.5px; font-weight: 600;
  padding: 7px 12px; border-radius: 999px; cursor: pointer; color: var(--trn-text-secondary);
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); transition: border-color 0.2s, color 0.2s, background 0.2s; }
.cs-chip :deep(svg:first-child) { color: var(--c); }
.cs-chip:hover { color: var(--trn-text); background: var(--trn-surface-elevated);
  border-color: color-mix(in srgb, var(--c) 40%, transparent); }
.cs-chip-arrow { color: var(--trn-text-dim); transition: transform 0.2s; }
.cs-chip:hover .cs-chip-arrow { transform: translate(2px, -2px); color: var(--c); }
</style>
