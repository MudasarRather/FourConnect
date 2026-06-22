<template>
  <div class="pol">
    <TrvSectionHead :icon="FileBadge" eyebrow="Travel · Governance" title="Travel" accent="Charter"
      subtitle="Grade-based cabin entitlements, configurable approval runways and the DA rate matrix — the rulebook every request is measured against.">
      <template #actions>
        <Motion as="button" class="btn primary" :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="openPolicy()">
          <Plus :size="15" /> New policy
        </Motion>
        <button class="icon-btn" :class="{ spin: loading }" @click="load" title="Refresh"><RefreshCw :size="15" /></button>
      </template>
      <template #lenses>
        <button v-for="l in lenses" :key="l.key" class="lens" :class="{ on: filter === l.key }" :style="{ '--c': l.hex }" @click="filter = filter === l.key ? '' : l.key">
          <component :is="l.icon" :size="11" /> {{ l.label }} <b>{{ l.count }}</b>
        </button>
      </template>
    </TrvSectionHead>

    <!-- signature instrument -->
    <PolicyAltitudeDeck :policies="policies" :grades="grades" @open="openPolicy" />

    <!-- policies -->
    <div v-if="loading" class="grid"><div v-for="n in 3" :key="n" class="skel" /></div>
    <div v-else-if="visible.length" class="grid">
      <PolicyPlateCard v-for="(p, i) in visible" :key="p.id" :p="p" :index="i"
        @edit="openPolicy" @detail="openPolicy" @remove="askRemove" @toggle="toggleActive" />
    </div>
    <TrvEmptyState v-else :icon="FileBadge"
      :title="filter ? 'No policies in this view' : 'No policies yet'"
      :subtitle="filter ? 'Clear the filter to see all charters.' : 'Define grade-based travel entitlements and the approval runway each request follows.'"
      :cta="filter ? '' : 'New policy'" :cta-icon="Plus" @cta="openPolicy()" />

    <!-- DA matrix -->
    <section class="matrix trv-grain" ref="matrixEl">
      <span class="mx-aura" aria-hidden="true" />
      <header class="mx-head">
        <div>
          <h3><Calculator :size="15" /> DA rate matrix</h3>
          <p class="mx-sub">Per-diem rates by grade × city tier. <button class="mx-link" @click="$emit('go', 'da')">Feeds the DA computation <ArrowUpRight :size="11" /></button></p>
        </div>
        <button class="btn ghost sm" @click="openRate()"><Plus :size="14" /> Add rate</button>
      </header>
      <div class="mx-scroll">
        <div class="mx-table">
          <div class="mx-row head">
            <span class="mx-corner">Grade</span>
            <span v-for="c in CITY_CATEGORIES" :key="c.key" class="mx-col" :style="{ '--c': c.hex }"><span class="mx-coldot" /> {{ c.label }}</span>
          </div>
          <Motion v-for="(g, gi) in matrixRows" :key="g.key" as="div" class="mx-row"
            :initial="{ opacity: 0, x: -8 }" :animate="drawn ? { opacity: 1, x: 0 } : {}" :transition="{ duration: 0.4, delay: gi * 0.05, ease: [0.16, 1, 0.3, 1] }">
            <span class="mx-grade">{{ g.label }}</span>
            <button v-for="c in CITY_CATEGORIES" :key="c.key" class="mx-cell" :class="{ filled: g.rates[c.key] }"
              :style="g.rates[c.key] ? { '--c': c.hex, '--heat': heat(g.rates[c.key].daily_rate) } : {}"
              @click="openRate(g, c)">
              <span v-if="g.rates[c.key]" class="trv-mono">{{ fmtCompactINR(g.rates[c.key].daily_rate) }}</span>
              <span v-else class="mx-empty"><Plus :size="11" /> set</span>
            </button>
          </Motion>
        </div>
      </div>
    </section>

    <!-- modals -->
    <PolicyModal :open="pModal" :policy="activePolicy" :grades="grades" @close="pModal = false" @saved="load" />
    <DaRateModal :open="rModal" :rate="activeRate" :grades="grades" @close="rModal = false" @saved="load" />
    <TrvDeleteModal :open="confirmOpen" :loading="busy" entity-label="policy"
      :name="confirmTarget?.policy_name" :meta="policyMeta" :icon="FileBadge" accent="#fbbf24"
      :tags="policyTags" :reasons="POLICY_REASONS"
      :deactivate-consequences="deactivateCons" :delete-consequences="deleteCons"
      deactivate-hint="Hide it from matching — config kept. Reversible."
      delete-hint="Erase the charter & its runway. Permanent."
      @close="confirmOpen = false" @confirm="doRemove" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Motion } from 'motion-v'
import { FileBadge, Plus, RefreshCw, Calculator, ArrowUpRight, Layers, CheckCircle2, CircleOff, Ban, Archive, Undo2, Trash2, SlidersHorizontal, ShieldAlert } from 'lucide-vue-next'
import TrvSectionHead from '../components/TrvSectionHead.vue'
import TrvEmptyState from '../components/TrvEmptyState.vue'
import PolicyAltitudeDeck from '../components/PolicyAltitudeDeck.vue'
import PolicyPlateCard from '../components/PolicyPlateCard.vue'
import PolicyModal from '../modals/PolicyModal.vue'
import DaRateModal from '../modals/DaRateModal.vue'
import TrvDeleteModal from '../modals/TrvDeleteModal.vue'
import { useToast } from 'vue-toastification'
import {
  fmtCompactINR, errText, fetchPolicies, deletePolicy, updatePolicy,
  fetchDaRates, fetchGrades, CITY_CATEGORIES,
} from '@/composables/useTravel'
import { useInView, prefersReduced } from '@/composables/useShiftMotion'

const emit = defineEmits(['go', 'refresh-stats'])
const toast = useToast()

const policies = ref([])
const rates = ref([])
const grades = ref([])
const loading = ref(false)
const busy = ref(false)
const filter = ref('')

const matrixEl = ref(null)
const drawn = ref(false)
const { visible: mxVisible } = useInView(matrixEl, { threshold: 0.15 })
watch(mxVisible, (v) => { if (v) requestAnimationFrame(() => requestAnimationFrame(() => { drawn.value = true })) })
onMounted(() => { if (prefersReduced()) drawn.value = true })

const lenses = computed(() => [
  { key: '', label: 'All', icon: Layers, hex: '#fbbf24', count: policies.value.length },
  { key: 'active', label: 'Active', icon: CheckCircle2, hex: '#34d399', count: policies.value.filter(p => p.is_active).length },
  { key: 'inactive', label: 'Inactive', icon: CircleOff, hex: '#6b7280', count: policies.value.filter(p => !p.is_active).length },
  { key: 'da', label: 'DA-eligible', icon: Calculator, hex: '#fb923c', count: policies.value.filter(p => p.da_eligible).length },
])
const visible = computed(() => {
  if (filter.value === 'active') return policies.value.filter(p => p.is_active)
  if (filter.value === 'inactive') return policies.value.filter(p => !p.is_active)
  if (filter.value === 'da') return policies.value.filter(p => p.da_eligible)
  return policies.value
})

const maxRate = computed(() => Math.max(1, ...rates.value.map(r => Number(r.daily_rate) || 0)))
const heat = (v) => Math.round((Number(v) / maxRate.value) * 100) / 100

const matrixRows = computed(() => {
  const rows = [{ key: '__wild', label: 'All grades', gradeId: null, rates: {} }]
  grades.value.forEach(g => rows.push({ key: g.id, label: g.name, gradeId: g.id, rates: {} }))
  for (const r of rates.value) {
    const key = r.grade_id || '__wild'
    const row = rows.find(x => x.key === key)
    if (row) row.rates[r.city_category] = r
  }
  return rows
})

const load = async () => {
  loading.value = true
  try {
    const [p, r, g] = await Promise.all([fetchPolicies({ include_inactive: true }), fetchDaRates({ include_inactive: true }), fetchGrades()])
    policies.value = p.items || []
    rates.value = r.items || []
    grades.value = g.items || g || []
  } catch (e) { toast.error(errText(e, 'Failed to load policies')) } finally { loading.value = false }
}

// policy modal
const pModal = ref(false)
const activePolicy = ref(null)
const openPolicy = (p = null) => { activePolicy.value = p; pModal.value = true }

// rate modal
const rModal = ref(false)
const activeRate = ref(null)
const openRate = (g = null, c = null) => {
  const existing = g && c ? g.rates[c.key] : null
  activeRate.value = existing
    ? { id: existing.id, grade_id: existing.grade_id, city_category: existing.city_category, daily_rate: Number(existing.daily_rate) }
    : { id: null, grade_id: g ? g.gradeId : null, city_category: c ? c.key : 'METRO', daily_rate: 0 }
  rModal.value = true
}

// toggle active
const toggleActive = async (p) => {
  try { await updatePolicy(p.id, { is_active: !p.is_active }); await load() }
  catch (e) { toast.error(errText(e, 'Could not update policy')) }
}

// delete
const confirmOpen = ref(false)
const confirmTarget = ref(null)
const POLICY_REASONS = ['Superseded by new policy', 'Grade restructured', 'Created by mistake', 'Entitlement change', 'Policy consolidated', 'Other']
const askRemove = (p) => { confirmTarget.value = p; confirmOpen.value = true }

const policyMeta = computed(() => {
  const p = confirmTarget.value
  if (!p) return ''
  return p.grade_name ? `Grade · ${p.grade_name}` : 'Applies to all grades'
})
const policyTags = computed(() => {
  const p = confirmTarget.value
  if (!p) return []
  const tags = [{ icon: Layers, text: p.grade_name || 'All grades' }]
  if (p.da_eligible) tags.push({ icon: Calculator, text: 'DA-eligible', hot: true })
  tags.push(p.is_active ? { icon: CheckCircle2, text: 'Active' } : { icon: CircleOff, text: 'Inactive' })
  return tags
})
const deactivateCons = [
  { icon: Ban, text: 'Stops matching new travel requests immediately.' },
  { icon: Archive, text: 'Submitted requests keep their snapshotted rules & chain.' },
  { icon: Undo2, text: 'Re-activate any time to restore the entitlement.' },
]
const deleteCons = [
  { icon: Trash2, text: 'Removed from the charter — new requests fall back to another matching/default policy.' },
  { icon: SlidersHorizontal, text: 'Its approval runway & entitlement settings are lost.' },
  { icon: Archive, text: 'Requests already submitted keep their snapshotted chain — unaffected.' },
  { icon: ShieldAlert, text: 'A delete entry with your reason is written to the audit log.' },
]

const doRemove = async ({ mode, reason } = {}) => {
  if (!confirmTarget.value) return
  busy.value = true
  try {
    const res = await deletePolicy(confirmTarget.value.id, { reason, deactivate: mode === 'deactivate' })
    if (res?.deactivated) toast.info(`${confirmTarget.value.policy_name} deactivated`)
    else toast.success(`${confirmTarget.value.policy_name} deleted`)
    confirmOpen.value = false; await load()
  } catch (e) { toast.error(errText(e)) } finally { busy.value = false }
}

onMounted(load)
</script>

<style scoped>
.pol { display: flex; flex-direction: column; }

.btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 15px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.btn.sm { padding: 7px 12px; font-size: 12px; }
.btn.primary { background: var(--trv-grad-hero); color: #1a1205; box-shadow: var(--trv-amber-glow); }
.btn.ghost { background: var(--trv-panel); border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.btn.ghost:hover { color: var(--trv-amber); border-color: var(--trv-amber-border); }
.icon-btn { display: inline-flex; padding: 9px; border-radius: 11px; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); cursor: pointer; }
.icon-btn:hover { color: var(--trv-amber); border-color: var(--trv-amber-border); }
.icon-btn.spin :deep(svg) { animation: pol-spin 0.9s linear infinite; }
@keyframes pol-spin { to { transform: rotate(360deg); } }

.lens { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 999px; cursor: pointer; font-size: 12px; font-weight: 600; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); transition: all 0.2s; }
.lens.on { color: var(--c, var(--trv-amber)); border-color: var(--c, var(--trv-amber-border)); background: color-mix(in srgb, var(--c, #fbbf24) 12%, transparent); }
.lens b { color: var(--trv-text); }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 14px; margin-bottom: 22px; }
.skel { height: 230px; border-radius: 18px; background: linear-gradient(100deg, var(--trv-surface) 30%, var(--trv-surface-elevated) 50%, var(--trv-surface) 70%); background-size: 200% 100%; animation: trv-runway-flow 1.4s linear infinite; }

/* DA matrix */
.matrix { position: relative; overflow: hidden; padding: 20px; border-radius: 20px; background: var(--trv-surface-elevated); border: 1px solid var(--trv-border); box-shadow: var(--trv-card-shadow); }
.mx-aura { position: absolute; inset: -50% 30% 50% -10%; pointer-events: none; background: radial-gradient(55% 70% at 20% 0%, rgba(251,146,60,0.1), transparent 70%); animation: trv-aura-drift 12s ease-in-out infinite; }
.mx-head { position: relative; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.mx-head h3 { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 800; color: var(--trv-text); margin: 0; }
.mx-sub { margin: 5px 0 0; font-size: 11.5px; color: var(--trv-text-muted); }
.mx-link { display: inline-flex; align-items: center; gap: 3px; background: none; border: none; padding: 0; cursor: pointer; color: var(--trv-amber); font-size: 11.5px; font-weight: 650; }
.mx-link:hover { text-decoration: underline; }
.mx-scroll { position: relative; overflow-x: auto; }
.mx-table { display: flex; flex-direction: column; gap: 7px; min-width: 600px; }
.mx-row { display: grid; grid-template-columns: 1.5fr repeat(4, 1fr); gap: 8px; align-items: center; }
.mx-row.head .mx-corner { font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--trv-text-dim); }
.mx-col { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: var(--c); }
.mx-coldot { width: 8px; height: 8px; border-radius: 50%; background: var(--c); box-shadow: 0 0 6px var(--c); }
.mx-grade { font-size: 12.5px; font-weight: 700; color: var(--trv-text-secondary); }
.mx-cell { display: inline-flex; align-items: center; justify-content: center; padding: 11px 9px; border-radius: 11px; cursor: pointer;
  background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-amber-bright); font-size: 12.5px; font-weight: 700; transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s; }
.mx-cell.filled { background: color-mix(in srgb, var(--c) calc(var(--heat, 0.4) * 26%), var(--trv-panel)); border-color: color-mix(in srgb, var(--c) 30%, transparent); color: var(--trv-text); }
.mx-cell:hover { transform: translateY(-2px); border-color: var(--trv-amber-border); box-shadow: var(--trv-card-shadow); }
.mx-cell.filled:hover { box-shadow: 0 6px 18px -6px color-mix(in srgb, var(--c) 60%, transparent); }
.mx-empty { display: inline-flex; align-items: center; gap: 3px; color: var(--trv-text-dim); font-weight: 500; font-size: 11px; }

@media (max-width: 520px) { .grid { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .skel, .icon-btn.spin :deep(svg), .mx-aura { animation: none; } .mx-cell { transition: none; } }
</style>
