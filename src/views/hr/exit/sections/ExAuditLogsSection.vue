<template>
  <div class="ex-audit">
    <ExSectionHead :icon="History" eyebrow="Exit Management · Forensic Recorder"
      title="Chain of" accent="Custody"
      subtitle="Every footstep along the gateway — struck into an immutable, hash-sealed, time-stamped chain.">
      <template #actions>
        <span class="aud-live" :class="{ off: reduced }"><i />Live</span>
        <ExSelect v-model="entityF" :options="entityOpts" size="sm" @change="reload" />
        <ExSelect v-model="actionF" :options="actionOpts" size="sm" searchable
          search-placeholder="Search 33 actions…" @change="reload" />
        <Motion as="button" class="aud-refresh" :class="{ busy: loading || windowLoading }"
          :whileHover="{ y: -2 }" :whileTap="{ scale: 0.94 }" title="Refresh recorder" type="button" @click="refreshAll">
          <RotateCw :size="14" />
        </Motion>
      </template>

      <template #lenses>
        <button v-for="l in lenses" :key="l.value" class="lens" :class="{ on: entityF === l.value }"
          type="button" @click="pickEntity(l.value)">
          <span class="lens-ic" :style="{ '--c': l.color }"><component :is="l.icon" :size="14" /></span>
          <span class="lens-tx">
            <b><ExCountUp :value="l.count" /></b>
            <i>{{ l.label }}</i>
          </span>
          <span class="lens-bar" :style="{ '--c': l.color }" />
        </button>
      </template>
    </ExSectionHead>

    <AuditChainForge :items="windowItems" :total="allTimeTotal" />

    <div class="aud-ledger-head">
      <span class="alh-title"><ScrollText :size="14" /> Sealed ledger</span>
      <span class="alh-meta">{{ filterSummary }}</span>
    </div>

    <div v-if="loading" class="grid-load"><Loader2 :size="22" class="spin" /> Reading the chain…</div>
    <ExEmptyState v-else-if="!items.length" :icon="History"
      title="No sealed events match" subtitle="Workflow events are recorded here automatically as cases move through the gateway. Adjust the filters above to widen the view." />
    <div v-else class="ledger">
      <AuditEventRow v-for="(a, i) in items" :key="a.id" :entry="a" :index="i" @go="$emit('go', $event)" />
    </div>

    <ExPager :page="page" :total-pages="totalPages" :total="total" :limit="limit" @update:page="goPage" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { History, Loader2, RotateCw, ScrollText } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import ExSectionHead from '../components/ExSectionHead.vue'
import ExSelect from '../components/ExSelect.vue'
import ExEmptyState from '../components/ExEmptyState.vue'
import ExPager from '../components/ExPager.vue'
import ExCountUp from '../components/ExCountUp.vue'
import AuditChainForge from '../components/AuditChainForge.vue'
import AuditEventRow from '../components/AuditEventRow.vue'
import { fetchAudit, errText } from '@/composables/useExit'
import { prefersReduced } from '@/composables/useShiftMotion'
import { AUDIT_ENTITIES, ALL_ACTIONS, auditActionMeta } from '../components/auditMeta.js'

defineEmits(['go'])
const toast = useToast()
const reduced = prefersReduced()

// filtered, server-paged ledger ------------------------------------------------
const items = ref([])
const total = ref(0)
const page = ref(1)
const limit = 10
const loading = ref(false)
const entityF = ref('')
const actionF = ref('')
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit)))

// unfiltered recent window — powers the forge + lenses + all-time total --------
const windowItems = ref([])
const allTimeTotal = ref(0)
const windowLoading = ref(false)

const entityOpts = [{ value: '', label: 'All entities' }, ...AUDIT_ENTITIES.map(e => ({ value: e.value, label: e.label, icon: e.icon }))]
const actionOpts = [
  { value: '', label: 'All actions' },
  ...ALL_ACTIONS.map(a => { const m = auditActionMeta(a); return { value: a, label: m.label, icon: m.icon, hint: m.label === a ? '' : a } }),
]

const lenses = computed(() => {
  const counts = {}
  for (const it of windowItems.value) counts[it.entity_type] = (counts[it.entity_type] || 0) + 1
  return [
    { value: '', label: 'All recent', icon: History, color: '#fb923c', count: windowItems.value.length },
    ...AUDIT_ENTITIES.map(e => ({ value: e.value, label: e.label, icon: e.icon, color: e.color, count: counts[e.value] || 0 })),
  ]
})

const filterSummary = computed(() => {
  const parts = []
  if (entityF.value) parts.push(AUDIT_ENTITIES.find(e => e.value === entityF.value)?.label || entityF.value)
  if (actionF.value) parts.push(auditActionMeta(actionF.value).label)
  return parts.length ? `Filtered · ${parts.join(' · ')}` : 'All recorded events'
})

const load = async () => {
  loading.value = true
  try {
    const params = { page: page.value, limit }
    if (entityF.value) params.entity_type = entityF.value
    if (actionF.value) params.action = actionF.value
    const d = await fetchAudit(params)
    items.value = d.items || []
    total.value = d.total || 0
  } catch (e) { toast.error(errText(e, 'Failed to load audit logs')) }
  finally { loading.value = false }
}

const loadWindow = async () => {
  windowLoading.value = true
  try {
    const d = await fetchAudit({ page: 1, limit: 120 })
    windowItems.value = d.items || []
    allTimeTotal.value = d.total || 0
  } catch { /* window is decorative — never block the ledger on it */ }
  finally { windowLoading.value = false }
}

const reload = () => { page.value = 1; load() }
const goPage = (p) => { page.value = p; load() }
const pickEntity = (v) => { if (entityF.value === v) return; entityF.value = v; reload() }
const refreshAll = () => { loadWindow(); reload() }

onMounted(() => { loadWindow(); load() })
</script>

<style scoped>
.ex-audit { color: var(--ex-text); }

/* hero actions */
.aud-live { display: inline-flex; align-items: center; gap: 6px; padding: 6px 11px; border-radius: 999px;
  font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ex-cleared);
  background: var(--ex-cleared-soft); border: 1px solid color-mix(in srgb, var(--ex-cleared) 30%, transparent); }
.aud-live i { width: 7px; height: 7px; border-radius: 50%; background: var(--ex-cleared); box-shadow: 0 0 8px var(--ex-cleared); animation: aud-blink 2s ease-in-out infinite; }
.aud-live.off i { animation: none; }
.aud-refresh { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; cursor: pointer;
  color: var(--ex-text-secondary); background: var(--ex-surface); border: 1px solid var(--ex-border); transition: color 0.2s, border-color 0.2s; }
.aud-refresh:hover { color: var(--ex-violet); border-color: var(--ex-violet-border); }
.aud-refresh.busy svg { animation: ex-spin-slow 0.8s linear infinite; }

/* entity lenses */
.lens { position: relative; overflow: hidden; display: flex; align-items: center; gap: 9px; padding: 9px 13px 11px; border-radius: 13px; cursor: pointer;
  background: var(--ex-surface); border: 1px solid var(--ex-border); transition: border-color 0.25s, transform 0.25s var(--ex-spring), background 0.25s; }
.lens:hover { transform: translateY(-2px); border-color: var(--ex-border-strong); }
.lens.on { border-color: var(--ex-violet-border); background: var(--ex-violet-soft); }
.lens-ic { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 9px; flex-shrink: 0; color: var(--c);
  background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.lens-tx { display: flex; flex-direction: column; line-height: 1.05; }
.lens-tx b { font-size: 16px; font-weight: 850; color: var(--ex-text); font-variant-numeric: tabular-nums; }
.lens-tx i { font-size: 9.5px; font-style: normal; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--ex-text-muted); }
.lens-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--c); transform: scaleX(0); transform-origin: left; transition: transform 0.3s var(--ex-spring); }
.lens:hover .lens-bar, .lens.on .lens-bar { transform: scaleX(1); }

/* ledger header */
.aud-ledger-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin: 4px 2px 12px; }
.alh-title { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 820; color: var(--ex-text); }
.alh-title svg { color: var(--ex-violet); }
.alh-meta { font-size: 11px; font-weight: 600; color: var(--ex-text-muted); }

.grid-load { display: flex; align-items: center; gap: 8px; justify-content: center; padding: 50px; color: var(--ex-text-muted); }
.spin { animation: ex-spin-slow 0.8s linear infinite; }
.ledger { display: flex; flex-direction: column; }

@keyframes aud-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
@media (prefers-reduced-motion: reduce) { .spin, .aud-live i, .aud-refresh.busy svg { animation: none; } .lens { transition: none; } }
</style>
