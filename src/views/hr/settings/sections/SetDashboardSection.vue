<template>
  <div class="sd">
    <SetSectionHead eyebrow="Governance · Command" title="The Governance" accent="Board"
      accent-color="var(--set-gold)" :icon="LayoutDashboard"
      sub="Every configuration domain in one place — wired, live, and traced to the modules it powers. Hover a chip to see what it governs; click to configure.">
      <template #actions>
        <button class="set-btn set-btn-steel" :disabled="loading" @click="load" title="Refresh governance state">
          <RefreshCw :size="14" :class="{ 'set-spin': loading }" />
        </button>
      </template>

      <!-- cinematic telemetry stat strip (SetCountUp preserved) -->
      <template #lenses>
        <div class="sd-lenses">
          <Motion v-for="(l, i) in lenses" :key="l.key" as="div" class="sd-lens" :style="{ '--acc': l.color }"
            :initial="reduced ? false : { opacity: 0, y: 16, scale: 0.96 }"
            :animate="{ opacity: 1, y: 0, scale: 1 }"
            :transition="{ duration: 0.5, delay: 0.08 + i * 0.07, ease: [0.16, 1, 0.3, 1] }"
            :while-hover="reduced ? {} : { y: -3 }">
            <span class="sd-lens-ic"><component :is="l.icon" :size="16" /></span>
            <div class="sd-lens-body">
              <b><SetCountUp :value="l.value" /></b>
              <span class="sd-lens-lab">{{ l.label }}</span>
              <span class="sd-lens-sub">{{ l.sub }}</span>
            </div>
            <span class="sd-lens-bar"><i :style="{ '--w': l.pct + '%' }" /></span>
          </Motion>
        </div>
      </template>

      <!-- signature instrument: governance readiness spectrum -->
      <Motion as="div"
        :initial="reduced ? false : { opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.6, delay: 0.42, ease: [0.16, 1, 0.3, 1] }">
        <GovernanceSpectrum :cells="specCells" :segments="specSegments" :modules="modulesPowered"
          :active="specActive" @hover="specActive = $event" @leave="specActive = null" @pick="onSpecPick" />
      </Motion>
    </SetSectionHead>

    <!-- the governance circuit board (preserved design, now cinematically alive) -->
    <Motion as="div" class="sd-board"
      :initial="reduced ? false : { opacity: 0, y: 22, scale: 0.985 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
      :transition="{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }">
      <GovernanceBoard :states="states" :external-active="boardActive"
        @pick="go" @open-module="openModule" />
    </Motion>

    <Motion as="div"
      :initial="reduced ? false : { opacity: 0, y: 22 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, delay: 0.34, ease: [0.16, 1, 0.3, 1] }">
      <ModuleLaunchpad :states="states" @pick="go" @hover="(s) => boardActive = s" @leave="boardActive = null" />
    </Motion>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Motion } from 'motion-v'
import { LayoutDashboard, RefreshCw, CircleCheck, CircleDashed, CircleSlash, Zap, Boxes } from 'lucide-vue-next'
import SetSectionHead from '../components/SetSectionHead.vue'
import SetCountUp from '../components/SetCountUp.vue'
import GovernanceBoard from '../components/GovernanceBoard.vue'
import GovernanceSpectrum from '../components/GovernanceSpectrum.vue'
import ModuleLaunchpad from '../components/ModuleLaunchpad.vue'
import { DOMAINS } from '../components/connectivity'
import { prefersReduced } from '@/composables/useShiftMotion'
import {
  listMaster, listStatutory, listNotificationRules, currentFiscalYear,
  listNumbering, getPayrollRules, listAppraisalTemplates,
} from '../composables/useHrSettings'
import { fetchMeritPolicies } from '@/composables/usePerformance'
import { fetchAssetTypes } from '@/composables/useAssets'

const emit = defineEmits(['go'])
const router = useRouter()
const reduced = prefersReduced()

const states = ref({})
const loading = ref(false)
const boardActive = ref(null)
const specActive = ref(null)

const configDomains = DOMAINS.filter(d => d.slug !== 'dashboard')
const totalDomains = configDomains.length

// slug -> API base (master list calls); settings masters live under /hr/settings/masters/*
const REST = {
  departments: 'departments', designations: 'designations', grades: 'grades',
  'work-locations': 'locations', 'asset-categories': 'asset-categories',
  'employment-types': 'settings/masters/employment-types',
  'employee-categories': 'settings/masters/employee-categories',
  'separation-reasons': 'settings/masters/separation-reasons',
}

async function load() {
  loading.value = true
  try {
    const slugs = Object.keys(REST)
    const calls = [
      ...slugs.map(s => listMaster(REST[s])),
      listStatutory(currentFiscalYear()),   // compliance
      listNotificationRules(),               // notification-rules
      listNumbering(),                       // numbering-series
      getPayrollRules(),                     // payroll-rules
      listAppraisalTemplates(),              // appraisal-templates
      fetchMeritPolicies(),                  // merit-policy  (was mislabeled "roadmap")
      fetchAssetTypes(),                     // asset-types   (was mislabeled "roadmap")
    ]
    const results = await Promise.allSettled(calls)
    const val = (i) => results[i].status === 'fulfilled' ? results[i].value : []
    const s = {}
    slugs.forEach((slug, i) => {
      const arr = val(i)
      s[slug] = { state: arr.length ? 'ok' : 'partial', count: arr.length }
    })
    const n = slugs.length
    const statRows = val(n), notifRows = val(n + 1), numRows = val(n + 2)
    const prRules = val(n + 3), apprRows = val(n + 4)
    const meritRows = val(n + 5), assetTypeRows = val(n + 6)
    s['compliance'] = { state: statRows.length ? 'ok' : 'partial', count: statRows.length }
    s['notification-rules'] = { state: notifRows.length ? 'ok' : 'partial', count: notifRows.length }
    s['approval-workflows'] = { state: 'ok', count: null }  // chains always resolve (defaults)
    s['numbering-series'] = { state: numRows.length ? 'ok' : 'partial', count: numRows.length }
    const prConfigured = (prRules && prRules.rules) ? prRules.rules.filter(r => r.configured).length : 0
    s['payroll-rules'] = { state: prConfigured ? 'ok' : 'partial', count: prConfigured }
    s['appraisal-templates'] = { state: apprRows.length ? 'ok' : 'partial', count: apprRows.length }
    // Performance + Assets instruments — shipped (phase A); fetch real state so the
    // board never mislabels a live domain as "on roadmap".
    const meritArr = Array.isArray(meritRows) ? meritRows : (meritRows?.items || [])
    const assetArr = Array.isArray(assetTypeRows) ? assetTypeRows : (assetTypeRows?.items || [])
    s['merit-policy'] = { state: meritArr.length ? 'ok' : 'partial', count: meritArr.length }
    s['asset-types'] = { state: assetArr.length ? 'ok' : 'partial', count: assetArr.length }
    // Module hubs + audit ledger are always-available governance surfaces.
    s['recruitment'] = { state: 'ok', count: null }
    s['onboarding'] = { state: 'ok', count: null }
    s['training'] = { state: 'ok', count: null }
    s['audit-logs'] = { state: 'ok', count: null }
    for (const d of DOMAINS) if (d.slug !== 'dashboard' && !s[d.slug]) s[d.slug] = { state: 'unset', count: null }
    states.value = s
  } finally { loading.value = false }
}
onMounted(load)

const counts = computed(() => {
  const vals = configDomains.map(d => states.value[d.slug]).filter(Boolean)
  return {
    ok: vals.filter(v => v.state === 'ok').length,
    partial: vals.filter(v => v.state === 'partial').length,
    unset: vals.filter(v => v.state === 'unset').length,
  }
})
const liveCount = computed(() => configDomains.filter(d => d.phase === 'A').length)
const modulesPowered = computed(() => new Set(DOMAINS.flatMap(d => d.governs)).size)

const pctOf = (v) => (totalDomains ? Math.round((v / totalDomains) * 100) : 0)
const lenses = computed(() => [
  { key: 'ok', icon: CircleCheck, color: 'var(--set-ok)', value: counts.value.ok, label: 'Configured', sub: 'live & wired', pct: pctOf(counts.value.ok) },
  { key: 'partial', icon: CircleDashed, color: 'var(--set-partial)', value: counts.value.partial, label: 'Partial', sub: 'awaiting setup', pct: pctOf(counts.value.partial) },
  { key: 'unset', icon: CircleSlash, color: 'var(--set-unset)', value: counts.value.unset, label: 'On roadmap', sub: 'phase B / C', pct: pctOf(counts.value.unset) },
  { key: 'live', icon: Zap, color: 'var(--set-gold)', value: liveCount.value, label: 'Live now', sub: 'phase A shipped', pct: pctOf(liveCount.value) },
  { key: 'modules', icon: Boxes, color: 'var(--set-orange)', value: modulesPowered.value, label: 'Modules powered', sub: 'downstream', pct: 100 },
])

const specCells = computed(() => configDomains.map(d => ({
  slug: d.slug, label: d.label, accent: d.accent,
  state: states.value[d.slug]?.state || 'unset',
})))
const specSegments = computed(() => [
  { key: 'ok', label: 'Configured', value: counts.value.ok, color: 'var(--set-ok)' },
  { key: 'partial', label: 'Partial', value: counts.value.partial, color: 'var(--set-partial)' },
  { key: 'unset', label: 'Roadmap', value: counts.value.unset, color: 'var(--set-unset)' },
])
const onSpecPick = (key) => { specActive.value = specActive.value === key ? null : key }

const go = (slug) => emit('go', slug)
const openModule = (to) => { if (to) router.push(to) }
</script>

<style scoped>
.sd { display: flex; flex-direction: column; gap: 16px; }

/* cinematic telemetry stat strip */
.sd-lenses { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
.sd-lens { position: relative; overflow: hidden; display: flex; align-items: center; gap: 11px;
  padding: 12px 13px 14px; border-radius: 14px;
  background: var(--set-surface-elevated); border: 1px solid var(--set-border); box-shadow: var(--set-card-shadow);
  transition: border-color 0.25s var(--set-spring), box-shadow 0.25s; }
.sd-lens:hover { border-color: color-mix(in srgb, var(--acc) 42%, transparent); box-shadow: var(--set-card-shadow-hover); }
.sd-lens-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
  color: var(--acc); background: color-mix(in srgb, var(--acc) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--acc) 28%, transparent); box-shadow: 0 0 16px -6px var(--acc); }
.sd-lens-body { display: flex; flex-direction: column; line-height: 1.08; min-width: 0; }
.sd-lens-body b { font-size: 22px; font-weight: 850; color: var(--set-text); font-variant-numeric: tabular-nums; }
.sd-lens-lab { font-size: 10.5px; font-weight: 800; letter-spacing: 0.03em; color: var(--set-text-secondary); white-space: nowrap; }
.sd-lens-sub { font-size: 9.5px; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; color: var(--set-text-dim); white-space: nowrap; }
.sd-lens-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: var(--set-trace-idle); }
.sd-lens-bar i { display: block; height: 100%; width: var(--w, 0%); border-radius: 0 3px 3px 0;
  background: linear-gradient(90deg, color-mix(in srgb, var(--acc) 55%, transparent), var(--acc));
  box-shadow: 0 0 10px -2px var(--acc); transition: width 1.1s var(--set-ease); }

.sd-board { position: relative; }

@media (max-width: 900px) { .sd-lenses { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 520px) { .sd-lenses { grid-template-columns: 1fr; } }
</style>
