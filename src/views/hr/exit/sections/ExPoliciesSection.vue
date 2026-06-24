<template>
  <div class="ex-pol">
    <PolicyConsole :stats="stats" :active-lens="activeLens" :focus="focusPolicy" :loading="loading"
      @pick="pickLens" @new="openNew" @refresh="load" @go="$emit('go', $event)" />

    <!-- loading -->
    <div v-if="loading && !policies.length" class="pol-skel">
      <div v-for="n in 3" :key="n" class="skel"><span class="skel-sheen" /></div>
    </div>

    <ExEmptyState v-else-if="!policies.length" :icon="ScrollText" title="No separation policies yet"
      subtitle="Draft an organisation-default charter to drive notice periods, clearance gates, gratuity and the settlement approval chain." />

    <template v-else>
      <div class="pol-cap">
        <span class="pc-count ex-mono">{{ filtered.length }}<i v-if="activeLens && activeLens !== 'all'"> · {{ lensLabel }}</i></span>
        <button v-if="activeLens && activeLens !== 'all'" class="pc-clear" type="button" @click="pickLens('all')"><X :size="12" /> Clear</button>
      </div>

      <div v-if="filtered.length" class="pol-grid">
        <PolicyCharterCard v-for="(p, i) in filtered" :key="p.id" :policy="p" :index="i"
          :in-force="p.id === inForceId" :focused="p.id === focusId"
          @edit="openEdit" @delete="askDelete" @focus="focusId = $event.id" />
      </div>
      <ExEmptyState v-else :icon="ScrollText" title="No policies match this lens"
        subtitle="Clear the filter to see the full charter set." />
    </template>

    <ExPolicyModal :open="modalOpen" :policy="editPolicy" :grades="grades" :busy="busy"
      @close="modalOpen = false" @save="onSave" />

    <PolicyRetireModal :open="delOpen" :policy="delPolicy" :is-default="delPolicy?.id === inForceId" :busy="busy"
      @close="delOpen = false" @delete="doDelete" @deactivate="doDeactivate" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { ScrollText, X } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import PolicyConsole from '../components/PolicyConsole.vue'
import PolicyCharterCard from '../components/PolicyCharterCard.vue'
import ExEmptyState from '../components/ExEmptyState.vue'
import ExPolicyModal from '../modals/ExPolicyModal.vue'
import PolicyRetireModal from '../modals/PolicyRetireModal.vue'
import { fetchPolicies, createPolicy, updatePolicy, deletePolicy, fetchGrades, errText } from '@/composables/useExit'

defineEmits(['go'])
const toast = useToast()

const policies = ref([]); const grades = ref([]); const loading = ref(false); const busy = ref(false)
const modalOpen = ref(false); const editPolicy = ref(null)
const delOpen = ref(false); const delPolicy = ref(null)
const activeLens = ref('')
const focusId = ref(null)

const LENS_LABELS = { active: 'Active', inactive: 'Inactive', default: 'Org default', scoped: 'Grade-scoped' }
const lensLabel = computed(() => LENS_LABELS[activeLens.value] || '')

const load = async () => {
  loading.value = true
  try {
    const d = await fetchPolicies({ include_inactive: true, limit: 100 })
    policies.value = d.items || []
    if (!focusId.value || !policies.value.some(p => p.id === focusId.value)) {
      focusId.value = inForceId.value || policies.value[0]?.id || null
    }
  } catch (e) { toast.error(errText(e, 'Failed to load policies')) }
  finally { loading.value = false }
}
const loadGrades = async () => { try { const d = await fetchGrades(); grades.value = d.items || [] } catch { grades.value = [] } }

// the resolved org-default in force: active wildcard (grade_id null), earliest created
const inForceId = computed(() => {
  const defaults = policies.value
    .filter(p => !p.grade_id && p.is_active)
    .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
  return defaults[0]?.id || null
})
const focusPolicy = computed(() => policies.value.find(p => p.id === focusId.value) || null)

const stats = computed(() => {
  const ps = policies.value
  const active = ps.filter(p => p.is_active)
  const notices = active.map(p => p.notice_period_days || 0)
  return {
    total: ps.length,
    active: active.length,
    inactive: ps.length - active.length,
    default: ps.filter(p => !p.grade_id).length,
    scoped: ps.filter(p => !!p.grade_id).length,
    avgNotice: notices.length ? Math.round(notices.reduce((a, b) => a + b, 0) / notices.length) : 0,
  }
})

const filtered = computed(() => {
  const l = activeLens.value
  if (!l || l === 'all') return policies.value
  if (l === 'active') return policies.value.filter(p => p.is_active)
  if (l === 'inactive') return policies.value.filter(p => !p.is_active)
  if (l === 'default') return policies.value.filter(p => !p.grade_id)
  if (l === 'scoped') return policies.value.filter(p => !!p.grade_id)
  return policies.value
})
const pickLens = (k) => { activeLens.value = (k === 'all' || activeLens.value === k) ? '' : k }

const openNew = () => { editPolicy.value = null; modalOpen.value = true }
const openEdit = (p) => { editPolicy.value = p; modalOpen.value = true }
const onSave = async (payload) => {
  busy.value = true
  try {
    if (editPolicy.value?.id) await updatePolicy(editPolicy.value.id, payload)
    else await createPolicy(payload)
    toast.success('Policy saved'); modalOpen.value = false; await load()
  } catch (e) { toast.error(errText(e, 'Save failed')) }
  finally { busy.value = false }
}
const askDelete = (p) => { delPolicy.value = p; delOpen.value = true }
const doDelete = async (reason) => {
  busy.value = true
  try {
    await deletePolicy(delPolicy.value.id, reason); toast.success('Policy retired'); delOpen.value = false; await load()
  } catch (e) { toast.error(errText(e, 'Delete failed')) }
  finally { busy.value = false }
}
const doDeactivate = async () => {
  busy.value = true
  try {
    await updatePolicy(delPolicy.value.id, { is_active: false }); toast.success('Policy deactivated'); delOpen.value = false; await load()
  } catch (e) { toast.error(errText(e, 'Could not deactivate')) }
  finally { busy.value = false }
}

watch(activeLens, () => {})
onMounted(() => { load(); loadGrades() })
</script>

<style scoped>
.ex-pol { color: var(--ex-text); }

.pol-skel { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; }
.skel { position: relative; overflow: hidden; height: 230px; border-radius: 18px; background: var(--ex-surface); border: 1px solid var(--ex-border); }
.skel-sheen { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(251,146,60,0.08) 50%, transparent 70%); animation: ex-sheen-pass 1.4s ease-in-out infinite; }

.pol-cap { display: flex; align-items: center; gap: 10px; margin: 0 2px 11px; }
.pc-count { font-size: 12px; font-weight: 800; color: var(--ex-text-muted); }
.pc-count i { font-style: normal; color: var(--ex-violet); }
.pc-clear { display: inline-flex; align-items: center; gap: 4px; margin-left: auto; padding: 4px 9px; border-radius: 8px; cursor: pointer; font-size: 11px; font-weight: 700; font-family: inherit;
  background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); color: var(--ex-violet); }
.pol-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 15px; }

@media (prefers-reduced-motion: reduce) { .skel-sheen { animation: none; } }
</style>
