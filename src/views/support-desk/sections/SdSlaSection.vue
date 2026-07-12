<template>
  <div class="sd-sla">
    <div class="sd-toolbar">
      <div class="sd-toolbar-lead">
        <h2 class="sd-toolbar-title">SLA Packages</h2>
        <p class="sd-toolbar-sub">Priority → response/resolution matrices and escalation ladders.</p>
      </div>
      <button class="sd-btn sd-btn-primary" @click="openCreate"><Plus :size="15" /> Add SLA Package</button>
    </div>

    <div v-if="packages.length" class="sd-sla-grid">
      <Motion
        v-for="(p, i) in packages"
        :key="p.id"
        as="button"
        type="button"
        class="sd-sla-card sd-card"
        :initial="{ opacity: 0, y: 12 }"
        :animate="{ opacity: 1, y: 0 }"
        :while-hover="{ y: -3 }"
        :transition="{ duration: 0.34, delay: Math.min(i * 0.03, 0.3), ease: [0.16, 1, 0.3, 1] }"
        @click="openEdit(p)"
      >
        <div class="sd-sla-top">
          <span class="sd-sla-badge"><Gauge :size="18" /></span>
          <div class="sd-sla-flags">
            <span v-if="p.is_default" class="sd-flag sd-flag-default">Default</span>
            <span v-if="!p.is_active" class="sd-flag sd-flag-inactive">inactive</span>
          </div>
        </div>
        <h3 class="sd-sla-name">{{ p.name }}</h3>
        <p v-if="p.description" class="sd-sla-desc">{{ p.description }}</p>
        <span class="sd-sla-cov" :class="{ bh: isBusinessHours(p) }">
          <component :is="isBusinessHours(p) ? Sunrise : Clock" :size="11" /> {{ coverageLabel(p) }}
        </span>

        <div class="sd-sla-matrix">
          <div
            v-for="row in matrixPreview(p)"
            :key="row.key"
            class="sd-sla-row"
          >
            <span class="sd-sla-prio" :style="{ '--pc': `var(--sd-pri-${row.key})` }">
              <span class="sd-sla-dot" />{{ row.label }}
            </span>
            <span class="sd-sla-times">
              <span class="sd-sla-resp">{{ row.response }}</span>
              <span class="sd-sla-sep">/</span>
              <span class="sd-sla-reso">{{ row.resolution }}</span>
            </span>
          </div>
        </div>
      </Motion>
    </div>
    <div v-else class="sd-empty-state">
      <Gauge :size="34" />
      <p>{{ loading ? 'Loading…' : 'No SLA packages yet.' }}</p>
      <button v-if="!loading" class="sd-btn sd-btn-primary" @click="openCreate"><Plus :size="15" /> Add your first</button>
    </div>

    <SdSlaModal :open="modalOpen" :package="editing" @close="modalOpen = false" @saved="onSaved" />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { Motion } from 'motion-v'
import { Plus, Gauge, Clock, Sunrise } from 'lucide-vue-next'
import SdSlaModal from '../modals/SdSlaModal.vue'
import { listSlaPackages } from '@/composables/useSupportDesk'

const props = defineProps({
  dashboard: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  createSignal: { type: Number, default: 0 },
})
const emit = defineEmits(['go', 'changed'])

const PRIORITY_ORDER = [
  ['critical', 'Critical'],
  ['urgent', 'Urgent'],
  ['high', 'High'],
  ['medium', 'Medium'],
  ['low', 'Low'],
]

const packages = ref([])
const loading = ref(true)
const modalOpen = ref(false)
const editing = ref(null)

const fmtMins = (m) => {
  const n = Number(m)
  if (!Number.isFinite(n) || n <= 0) return '—'
  if (n < 60) return `${n}m`
  const h = n / 60
  return `${Number.isInteger(h) ? h : h.toFixed(1)}h`
}

const DAY_ABBR = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' }
const isBusinessHours = (p) => (p.coverage || {}).mode === 'business_hours'
const coverageLabel = (p) => {
  const c = p.coverage || {}
  if (c.mode !== 'business_hours') return '24×7 clock'
  const days = (c.days || []).map(Number).sort((a, b) => a - b)
  const contiguous = days.length > 1 && days[days.length - 1] - days[0] === days.length - 1
  const dayStr = contiguous ? `${DAY_ABBR[days[0]]}–${DAY_ABBR[days[days.length - 1]]}`
    : days.map(d => DAY_ABBR[d]).join(' ')
  const holi = (c.holidays || []).length
  return `${c.start || '09:00'}–${c.end || '18:00'} · ${dayStr}${holi ? ` · ${holi} holiday${holi > 1 ? 's' : ''}` : ''}`
}

const matrixPreview = (p) => {
  const m = p.matrix || {}
  return PRIORITY_ORDER.map(([key, label]) => {
    const cell = m[key] || {}
    return {
      key,
      label,
      response: fmtMins(cell.response_mins),
      resolution: fmtMins(cell.resolution_mins),
    }
  })
}

const reload = async () => {
  loading.value = true
  try {
    packages.value = await listSlaPackages()
  } catch { packages.value = [] }
  finally { loading.value = false }
}
const openCreate = () => { editing.value = null; modalOpen.value = true }
const openEdit = (p) => { editing.value = p; modalOpen.value = true }
const onSaved = () => { modalOpen.value = false; reload(); emit('changed') }

watch(() => props.createSignal, () => { if (props.createSignal) openCreate() })
onMounted(reload)
</script>

<style scoped>
.sd-sla { display: flex; flex-direction: column; gap: 16px; }
.sd-toolbar { display: flex; gap: 12px; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; }
.sd-toolbar-lead { min-width: 0; }
.sd-toolbar-title { font-size: 16px; font-weight: 700; color: var(--sd-text); margin: 0 0 3px; }
.sd-toolbar-sub { font-size: 12.5px; color: var(--sd-text-muted); margin: 0; }
.sd-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 11px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; background: var(--sd-grad-hero); color: #1a1206; white-space: nowrap; }
[data-theme="light"] .sd-btn-primary { color: #fff8ec; }

.sd-sla-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.sd-sla-card { padding: 18px; text-align: left; cursor: pointer; transition: border-color 0.2s var(--sd-spring), box-shadow 0.2s var(--sd-spring); }
.sd-sla-card:hover { border-color: var(--sd-amber-border); box-shadow: var(--sd-card-shadow); }
.sd-sla-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
.sd-sla-badge { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 12px; color: var(--sd-amber); background: var(--sd-amber-soft); }
.sd-sla-flags { display: flex; gap: 6px; }
.sd-flag { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; padding: 3px 8px; border-radius: 6px; }
.sd-flag-default { color: var(--sd-amber); background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border); }
.sd-flag-inactive { color: var(--sd-steel); background: var(--sd-steel-soft); }
.sd-sla-name { font-size: 16px; font-weight: 700; color: var(--sd-text); margin: 0 0 4px; }
.sd-sla-desc { font-size: 12px; color: var(--sd-text-muted); margin: 0 0 12px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }

.sd-sla-cov { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; margin: 2px 0 10px;
  padding: 4px 11px; border-radius: 999px; font-family: var(--sd-mono); font-size: 10px; font-weight: 700;
  letter-spacing: 0.06em; color: var(--sd-text-muted); background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); }
.sd-sla-cov.bh { color: var(--sd-amber); background: var(--sd-amber-soft); border-color: var(--sd-amber-border); }
.sd-sla-matrix { display: flex; flex-direction: column; gap: 5px; padding-top: 12px; border-top: 1px solid var(--sd-border); }
.sd-sla-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.sd-sla-prio { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 600; color: var(--pc); }
.sd-sla-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--pc); flex-shrink: 0; }
.sd-sla-times { display: inline-flex; align-items: center; gap: 6px; font-family: var(--sd-mono); font-size: 11.5px; }
.sd-sla-resp { color: var(--sd-text-secondary); }
.sd-sla-sep { color: var(--sd-text-dim); }
.sd-sla-reso { color: var(--sd-text-muted); }

.sd-empty-state { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 56px 20px; color: var(--sd-text-dim); text-align: center; }
.sd-empty-state p { margin: 0; font-size: 14px; color: var(--sd-text-muted); }
</style>
