<template>
  <div class="dmg">
    <DmgTriageHero :summary="summary" :active-status="activeStatus" :active-severity="activeSeverity"
      @log="openLog" @go="$emit('go', $event)" @pick-status="toggleStatus" @pick-severity="toggleSeverity" />

    <!-- filter strip -->
    <Transition name="dmg-fade">
      <div v-if="activeStatus || activeSeverity" class="dmg-filterbar">
        <span class="dmg-fb-label"><Filter :size="13" /> Showing {{ filtered.length }} of {{ allRows.length }}</span>
        <span v-if="activeStatus" class="dmg-fb-chip" :style="{ '--c': statusMeta(activeStatus).color }">{{ statusMeta(activeStatus).label }}<button @click="activeStatus = ''"><X :size="11" /></button></span>
        <span v-if="activeSeverity" class="dmg-fb-chip" :style="{ '--c': sevMeta(activeSeverity).color }">{{ sevMeta(activeSeverity).label }}<button @click="activeSeverity = ''"><X :size="11" /></button></span>
        <button class="dmg-fb-clear" @click="clearFilters"><FilterX :size="12" /> Clear</button>
      </div>
    </Transition>

    <!-- loading -->
    <div v-if="loading" class="dmg-grid">
      <div v-for="n in 4" :key="n" class="as-skel" style="height:300px;border-radius:18px" />
    </div>

    <!-- empty -->
    <AssetEmptyState v-else-if="!filtered.length" :icon="ShieldAlert"
      :title="hasFilter ? 'No incidents match' : 'No damage on the board'"
      :sub="hasFilter ? 'Try a different lens, or clear the filters.' : 'When HR or an employee reports a damaged asset, it lands here for triage.'">
      <button v-if="hasFilter" class="as-btn as-btn-ghost" @click="clearFilters"><FilterX :size="14" /> Clear filters</button>
      <button class="as-btn as-btn-danger" @click="openLog"><ShieldAlert :size="14" /> Log damage</button>
    </AssetEmptyState>

    <!-- triage board -->
    <div v-else class="dmg-grid" :key="gridKey">
      <DmgIncidentCard v-for="(d, i) in filtered" :key="d.id" :ticket="d" :index="i"
        @advance="(to) => advance(d, to)" @resolve="openResolve(d, false)" @writeoff="openResolve(d, true)"
        @reject="reject(d)" @detail="$emit('detail', d.asset_id)" @go="$emit('go', $event)" />
    </div>

    <LogDamageModal :open="logOpen" @close="logOpen = false" @created="onMutated" />
    <DmgResolveModal :open="resolveOpen" :ticket="resolveTarget" :write-off="resolveWriteOff"
      @close="resolveOpen = false" @done="onMutated" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { ShieldAlert, Filter, FilterX, X } from 'lucide-vue-next'
import DmgTriageHero from '../components/DmgTriageHero.vue'
import DmgIncidentCard from '../components/DmgIncidentCard.vue'
import AssetEmptyState from '../components/AssetEmptyState.vue'
import LogDamageModal from '../modals/LogDamageModal.vue'
import DmgResolveModal from '../modals/DmgResolveModal.vue'
import { fetchDamages, patchDamage, damageAction, errText } from '@/composables/useAssets'
import { sevMeta, statusMeta, isOpen, SEVERITIES } from '../components/dmgMeta.js'

const emit = defineEmits(['refresh-stats', 'detail', 'go'])
const toast = useToast()

const allRows = ref([])
const loading = ref(true)
const activeStatus = ref('')
const activeSeverity = ref('')
const gridKey = ref(0)

async function reload() {
  loading.value = true
  try { allRows.value = (await fetchDamages({ limit: 200 })).items || [] }
  catch (e) { toast.error(errText(e, 'Failed to load damage tickets')) }
  finally { loading.value = false }
}
onMounted(reload)

const hasFilter = computed(() => !!activeStatus.value || !!activeSeverity.value)
const filtered = computed(() => {
  let rows = allRows.value
  if (activeStatus.value) rows = rows.filter(r => r.status === activeStatus.value)
  if (activeSeverity.value) rows = rows.filter(r => r.severity === activeSeverity.value)
  return rows
})

const summary = computed(() => {
  const r = allRows.value
  const by = (st) => r.filter(x => x.status === st).length
  const open = r.filter(x => isOpen(x.status))
  const severityCounts = {}
  for (const k of SEVERITIES) severityCounts[k] = open.filter(x => x.severity === k).length
  return {
    reported: by('REPORTED'), review: by('UNDER_REVIEW'), repair: by('IN_REPAIR'),
    resolved: by('RESOLVED'), writeoff: by('WRITE_OFF'), rejected: by('REJECTED'),
    open: open.length,
    critical: open.filter(x => ['MAJOR', 'TOTAL_LOSS'].includes(x.severity)).length,
    recovery: open.reduce((s, x) => s + Number(x.recovery_amount || 0), 0),
    severityCounts,
  }
})

function toggleStatus(s) { activeStatus.value = activeStatus.value === s ? '' : s }
function toggleSeverity(s) { activeSeverity.value = activeSeverity.value === s ? '' : s }
function clearFilters() { activeStatus.value = ''; activeSeverity.value = '' }

// ── actions ──
async function advance(d, to) {
  try { await patchDamage(d.id, { status: to }); toast.success(`Moved to ${statusMeta(to).label.toLowerCase()}`); reload(); emit('refresh-stats') }
  catch (e) { toast.error(errText(e, 'Failed to update status')) }
}
async function reject(d) {
  try { await damageAction(d.id, 'reject'); toast.success('Ticket rejected'); reload(); emit('refresh-stats') }
  catch (e) { toast.error(errText(e, 'Failed to reject')) }
}

const logOpen = ref(false)
const openLog = () => { logOpen.value = true }

const resolveOpen = ref(false)
const resolveTarget = ref(null)
const resolveWriteOff = ref(false)
function openResolve(d, writeOff) { resolveTarget.value = d; resolveWriteOff.value = writeOff; resolveOpen.value = true }

function onMutated() { gridKey.value++; reload(); emit('refresh-stats') }
</script>

<style scoped>
.dmg { display: flex; flex-direction: column; gap: 14px; }

.dmg-filterbar { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; padding: 9px 14px; border-radius: 13px; background: var(--as-surface); border: 1px solid var(--as-border-soft); }
.dmg-fb-label { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 700; color: var(--as-text-muted); }
.dmg-fb-label :deep(svg) { color: var(--as-al-damaged); }
.dmg-fb-chip { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 700; color: var(--c); padding: 4px 6px 4px 11px; border-radius: 999px;
  background: color-mix(in srgb, var(--c) 11%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.dmg-fb-chip button { display: grid; place-items: center; width: 17px; height: 17px; border-radius: 50%; border: none; cursor: pointer; color: var(--c); background: color-mix(in srgb, var(--c) 18%, transparent); }
.dmg-fb-clear { margin-left: auto; display: inline-flex; align-items: center; gap: 5px; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; color: var(--as-text-muted); background: none; border: none; }
.dmg-fb-clear:hover { color: var(--as-text); }

.dmg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 14px; }
@media (max-width: 760px) { .dmg-grid { grid-template-columns: 1fr; } }

.dmg-fade-enter-active, .dmg-fade-leave-active { transition: opacity 0.25s var(--as-ease), transform 0.25s var(--as-ease); }
.dmg-fade-enter-from, .dmg-fade-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
