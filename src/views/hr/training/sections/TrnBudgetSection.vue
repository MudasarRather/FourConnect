<template>
  <div class="trn-sec">
    <BudgetVaultHero :summary="summary" v-model:year="year" :years="years" :budget-count="budgets.length" @create="openCreate" />

    <BudgetBreakdownPanel v-if="!loading && budgets.length" :summary="summary" />

    <div v-if="budgets.length || loading" class="bd-listhead">
      <div class="bd-listhead-l">
        <h2>Allocations</h2>
        <span class="bd-count trn-mono">FY {{ year }}</span>
      </div>
      <button v-if="hasArchived" class="bd-toggle" :class="{ on: showArchived }" @click="showArchived = !showArchived">
        <Archive :size="13" /> {{ showArchived ? 'Hide archived' : `Show archived (${archivedCount})` }}
      </button>
    </div>

    <div v-if="loading" class="bd-grid"><div v-for="n in 3" :key="n" class="trn-skel" style="height:230px; border-radius:18px" /></div>

    <TrnEmptyState v-else-if="!budgets.length" :icon="Wallet" title="No budgets for this year"
      :sub="`Allocate an L&D budget for FY ${year} to start tracking committed vs spent.`">
      <button class="trn-btn trn-btn-primary" @click="openCreate" style="margin-top:14px"><Plus :size="15" /> New budget</button>
    </TrnEmptyState>

    <TransitionGroup v-else name="bd-flow" tag="div" class="bd-grid">
      <BudgetCard v-for="(b, i) in visibleBudgets" :key="b.id" :budget="b" :index="i"
        :expanded="expanded === b.id" :items="expanded === b.id ? items : []" :items-loading="itemsLoading"
        @edit="openEdit" @delete="confirmDelete" @toggle-items="toggleItems" @add-item="openItem"
        @remove-item="removeItem" @toggle-active="toggleActive" @go="$emit('go', $event)" />
    </TransitionGroup>

    <BudgetFormModal :open="formOpen" :budget="editing" :existing="budgets" @close="formOpen=false" @saved="onSaved" />
    <BudgetItemModal :open="itemOpen" :budget="itemBudget" @close="itemOpen=false" @saved="onItemSaved" />
    <TrnDeleteModal :open="delOpen" :loading="deleting" title="Delete budget" :item-name="delTarget?.name"
      :item-meta="delTarget ? `${delTarget.item_count || 0} cost line(s) · FY${delTarget.fiscal_year}` : ''" :icon="Wallet"
      :consequences="delConsequences" :reasons="['Created in error', 'Superseded', 'Reorganised', 'Other']"
      confirm-label="Delete budget" @close="delOpen=false" @confirm="doDelete" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { Plus, Wallet, Archive } from 'lucide-vue-next'
import TrnEmptyState from '../components/TrnEmptyState.vue'
import TrnDeleteModal from '../components/TrnDeleteModal.vue'
import BudgetVaultHero from '../components/BudgetVaultHero.vue'
import BudgetBreakdownPanel from '../components/BudgetBreakdownPanel.vue'
import BudgetCard from '../components/BudgetCard.vue'
import BudgetFormModal from '../modals/BudgetFormModal.vue'
import BudgetItemModal from '../modals/BudgetItemModal.vue'
import { fetchBudgets, deleteBudget, patchBudget, fetchBudgetSummary, fetchBudgetItems, deleteBudgetItem } from '@/composables/useTraining'

const emit = defineEmits(['refresh-stats', 'go'])
const toast = useToast()

const thisYear = new Date().getFullYear()
const years = [thisYear + 1, thisYear, thisYear - 1, thisYear - 2]
const year = ref(thisYear)
const budgets = ref([])
const summary = ref(null)
const loading = ref(true)
const showArchived = ref(false)

const formOpen = ref(false)
const editing = ref(null)
const itemOpen = ref(false)
const itemBudget = ref(null)
const expanded = ref(null)
const items = ref([])
const itemsLoading = ref(false)

const delOpen = ref(false)
const delTarget = ref(null)
const deleting = ref(false)

const archivedCount = computed(() => budgets.value.filter(b => b.is_active === false).length)
const hasArchived = computed(() => archivedCount.value > 0)
const visibleBudgets = computed(() => showArchived.value ? budgets.value : budgets.value.filter(b => b.is_active !== false))
const delConsequences = computed(() => [
  `Removes this allocation and its ${delTarget.value?.item_count || 0} cost line(s)`,
  'Committed & spent history for this budget is lost',
])

const reload = async () => {
  loading.value = true
  try {
    budgets.value = await fetchBudgets({ fiscal_year: year.value }) || []
    summary.value = await fetchBudgetSummary(year.value)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load budgets') }
  finally { loading.value = false }
}
onMounted(reload)
watch(year, () => { expanded.value = null; reload() })

const openCreate = () => { editing.value = null; formOpen.value = true }
const openEdit = (b) => { editing.value = b; formOpen.value = true }
const onSaved = () => { reload(); emit('refresh-stats') }
const openItem = (b) => { itemBudget.value = b; itemOpen.value = true }
const onItemSaved = () => {
  const id = itemBudget.value?.id
  reload()
  if (id && expanded.value === id) loadItems({ id })
}

const toggleItems = async (b) => {
  if (expanded.value === b.id) { expanded.value = null; return }
  expanded.value = b.id
  await loadItems(b)
}
const loadItems = async (b) => {
  itemsLoading.value = true
  try { items.value = await fetchBudgetItems(b.id) } catch { items.value = [] }
  finally { itemsLoading.value = false }
}
const removeItem = async ({ item, budget }) => {
  try { await deleteBudgetItem(item.id); toast.success('Cost line removed'); reload(); loadItems(budget) }
  catch (e) { toast.error(e?.response?.data?.detail || 'Could not remove') }
}

const toggleActive = async (b) => {
  try {
    await patchBudget(b.id, { is_active: b.is_active === false })
    toast.success(b.is_active === false ? 'Budget restored' : 'Budget archived')
    reload()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not update') }
}

const confirmDelete = (b) => { delTarget.value = b; delOpen.value = true }
const doDelete = async () => {
  if (!delTarget.value) return
  deleting.value = true
  try {
    await deleteBudget(delTarget.value.id)
    toast.success('Budget deleted')
    delOpen.value = false
    reload(); emit('refresh-stats')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not delete') }
  finally { deleting.value = false }
}
</script>

<style scoped>
.trn-sec { display: flex; flex-direction: column; gap: 18px; }

.bd-listhead { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.bd-listhead-l { display: flex; align-items: center; gap: 10px; }
.bd-listhead-l h2 { margin: 0; font-size: 17px; font-weight: 800; letter-spacing: -0.01em; color: var(--trn-text); }
.bd-count { font-size: 11.5px; font-weight: 700; padding: 2px 10px; border-radius: 999px; background: color-mix(in srgb, var(--trn-amber) 14%, transparent); color: var(--trn-amber-strong); }
.bd-toggle { display: inline-flex; align-items: center; gap: 6px; font: inherit; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 9px; cursor: pointer;
  color: var(--trn-text-muted); background: var(--trn-surface); border: 1px solid var(--trn-border-soft); transition: all 0.2s; }
.bd-toggle:hover { color: var(--trn-text); border-color: var(--trn-border-strong); }
.bd-toggle.on { color: var(--trn-amber-strong); border-color: color-mix(in srgb, var(--trn-amber) 38%, transparent); background: color-mix(in srgb, var(--trn-amber) 12%, transparent); }

.bd-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 14px; align-items: start; }
.bd-flow-move { transition: transform 0.45s var(--trn-spring); }
.bd-flow-enter-active { transition: all 0.42s var(--trn-spring); }
.bd-flow-leave-active { transition: all 0.32s var(--trn-spring); position: absolute; }
.bd-flow-enter-from { opacity: 0; transform: translateY(14px) scale(0.98); }
.bd-flow-leave-to { opacity: 0; transform: scale(0.96); }

@media (prefers-reduced-motion: reduce) {
  .bd-flow-move, .bd-flow-enter-active, .bd-flow-leave-active { transition: none; }
}
</style>
