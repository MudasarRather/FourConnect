<template>
  <AssetModal :open="open" :title="report ? `Compose · ${report.name}` : 'Compose dossier'"
    subtitle="Scope it, preview the cover, then render" :icon="FileBarChart2" :width="660" @close="$emit('close')">
    <div v-if="report" class="cx" :style="{ '--a': report.accent, '--ad': report.accent_deep || report.accent }">

      <!-- live cover preview (mirrors the rendered PDF motif) -->
      <Motion as="div" class="cx-cover" :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }">
        <span class="cx-grid" aria-hidden="true" />
        <span class="cx-crest">{{ report.icon }}</span>
        <div class="cx-cover-id">
          <span class="cx-eyebrow">{{ report.eyebrow }}</span>
          <h4 class="cx-title">{{ report.name }}</h4>
          <p class="cx-sub">{{ report.tagline }}</p>
          <span class="cx-period"><CalendarRange :size="11" /> {{ periodLabel }}</span>
        </div>
        <div class="cx-kpis">
          <AnimatePresence>
            <Motion v-for="(k, i) in kpis" :key="k.label" as="div" class="cx-kpi"
              :initial="{ opacity: 0, scale: 0.9 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0 }"
              :transition="{ duration: 0.3, delay: 0.1 + i * 0.06 }">
              <b>{{ k.value }}</b><span>{{ k.label }}</span>
            </Motion>
          </AnimatePresence>
          <div v-if="!kpis.length" class="cx-kpi ghost"><b>—</b><span>preview</span></div>
        </div>
      </Motion>

      <!-- scope -->
      <div class="cx-block">
        <span class="cx-block-h"><SlidersHorizontal :size="12" /> Scope</span>
        <div class="cx-scope">
          <label class="cx-field">
            <span class="cx-lab">From</span>
            <HrDatePicker v-model="from" :max="to || ''" placeholder="Earliest" />
          </label>
          <label class="cx-field">
            <span class="cx-lab">To</span>
            <HrDatePicker v-model="to" :min="from || ''" placeholder="Latest" />
          </label>
          <label class="cx-field">
            <span class="cx-lab">Department</span>
            <AsSelect v-model="department_id" :options="deptOptions" placeholder="All departments" />
          </label>
        </div>
        <p class="cx-hint"><Info :size="11" /> Date range narrows time-stamped logs (maintenance, damage); department scopes the asset registers.</p>
      </div>

      <!-- format -->
      <div class="cx-block">
        <span class="cx-block-h"><FileBarChart2 :size="12" /> Format</span>
        <div class="cx-fmts">
          <Motion v-for="f in FORMATS" :key="f.v" as="button" type="button" class="cx-fmt" :class="{ on: format === f.v }"
            :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="format = f.v">
            <span class="cx-fmt-ic"><component :is="f.icon" :size="17" /></span>
            <span class="cx-fmt-l">{{ f.l }}</span>
            <span class="cx-fmt-b">{{ f.blurb }}</span>
            <Check v-if="format === f.v" :size="14" class="cx-fmt-tick" />
          </Motion>
        </div>
      </div>
    </div>

    <template #footer>
      <button class="as-btn as-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="as-btn as-btn-primary" :class="{ disabled: busy }"
        :whileHover="busy ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" :disabled="busy" @click="submit">
        <Loader v-if="busy" :size="14" class="spin" /><Download v-else :size="14" />
        {{ busy ? 'Rendering…' : `Render ${fmtLabel}` }}
      </Motion>
    </template>
  </AssetModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence } from 'motion-v'
import {
  FileBarChart2, FileType, Sheet, FileText, CalendarRange, SlidersHorizontal,
  Info, Check, Download, Loader,
} from 'lucide-vue-next'
import AssetModal from '../components/AssetModal.vue'
import AsSelect from '../components/AsSelect.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import { titleCase } from '@/composables/useAssets'

const props = defineProps({
  open: { type: Boolean, default: false },
  report: { type: Object, default: null },
  live: { type: Object, default: null },          // {count, summary}
  departments: { type: Array, default: () => [] }, // [{id,name}] | [{value,label}]
  scope: { type: Object, default: () => ({}) },     // {from,to,department_id}
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'submit'])

const FORMATS = [
  { v: 'pdf', l: 'PDF', icon: FileType, blurb: 'Branded cover' },
  { v: 'excel', l: 'Excel', icon: Sheet, blurb: 'KPI board + data' },
  { v: 'csv', l: 'CSV', icon: FileText, blurb: 'Raw rows' },
]

const from = ref('')
const to = ref('')
const department_id = ref('')
const format = ref('pdf')

// hydrate from the page-level scope each time the modal opens
watch(() => props.open, (o) => {
  if (!o) return
  from.value = props.scope?.from || ''
  to.value = props.scope?.to || ''
  department_id.value = props.scope?.department_id || ''
  format.value = 'pdf'
})

const deptOptions = computed(() => [
  { value: '', label: 'All departments' },
  ...props.departments.map(d => (d && d.id != null) ? { value: d.id, label: d.name } : d),
])

const periodLabel = computed(() => (from.value && to.value) ? `${from.value} → ${to.value}` : 'All time')
const fmtLabel = computed(() => FORMATS.find(f => f.v === format.value)?.l || 'PDF')

const MONEYISH = /(value|cost|book|sale|spend|recovery|premium)/i
function compact(n) {
  const v = Number(n) || 0
  if (v >= 1e7) return (v / 1e7).toFixed(1) + 'Cr'
  if (v >= 1e5) return (v / 1e5).toFixed(1) + 'L'
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'k'
  return String(Math.round(v))
}
const kpis = computed(() => {
  const s = props.live?.summary || {}
  const out = []
  for (const [k, v] of Object.entries(s)) {
    if (v == null || typeof v === 'object') continue
    if (typeof v === 'boolean') continue
    out.push({ label: titleCase(k), value: MONEYISH.test(k) ? '₹' + compact(v) : compact(v) })
    if (out.length >= 4) break
  }
  return out
})

function submit() {
  emit('submit', {
    format: format.value,
    from: from.value || undefined,
    to: to.value || undefined,
    department_id: department_id.value || undefined,
  })
}
</script>

<style scoped>
.cx { display: flex; flex-direction: column; gap: 16px; }

/* cover preview */
.cx-cover { position: relative; overflow: hidden; display: flex; gap: 14px; padding: 18px 18px 16px; border-radius: 15px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--a) 16%, var(--as-surface-elevated)), var(--as-surface));
  border: 1px solid color-mix(in srgb, var(--a) 30%, transparent);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 14px 32px -22px var(--a); }
.cx-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(color-mix(in srgb, var(--a) 9%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--a) 9%, transparent) 1px, transparent 1px);
  background-size: 26px 26px; mask-image: radial-gradient(120% 100% at 100% 0%, #000 20%, transparent 75%);
  -webkit-mask-image: radial-gradient(120% 100% at 100% 0%, #000 20%, transparent 75%); }
.cx-crest { position: relative; display: grid; place-items: center; width: 48px; height: 48px; border-radius: 13px; flex-shrink: 0;
  font-size: 22px; font-weight: 900; color: #fff; background: linear-gradient(135deg, var(--a), var(--ad)); box-shadow: 0 10px 22px -10px var(--a); }
.cx-cover-id { position: relative; flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.cx-eyebrow { font-size: 8.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ad); }
[data-theme="dark"] .cx-eyebrow { color: color-mix(in srgb, var(--a) 80%, #fff); }
.cx-title { margin: 1px 0 0; font-size: 19px; font-weight: 850; letter-spacing: -0.02em; color: var(--as-text); }
.cx-sub { margin: 0; font-size: 12px; color: var(--as-text-muted); }
.cx-period { display: inline-flex; align-items: center; gap: 5px; margin-top: 4px; font-family: var(--as-mono); font-size: 10px; color: var(--as-text-dim); }
.cx-kpis { position: relative; display: flex; flex-direction: column; gap: 6px; align-items: flex-end; flex-shrink: 0; min-width: 96px; }
.cx-kpi { display: flex; flex-direction: column; align-items: flex-end; padding: 6px 11px; border-radius: 9px; min-width: 84px;
  background: var(--as-surface); border: 1px solid color-mix(in srgb, var(--a) 24%, transparent); }
.cx-kpi b { font-family: var(--as-mono); font-size: 16px; font-weight: 800; color: var(--as-text); line-height: 1.1; }
.cx-kpi span { font-size: 8px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--as-text-dim); }
.cx-kpi.ghost { opacity: 0.5; }

/* blocks */
.cx-block { display: flex; flex-direction: column; gap: 10px; }
.cx-block-h { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--as-text-dim); }
.cx-block-h :deep(svg) { color: var(--a); }
.cx-scope { display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: 11px; }
@media (max-width: 560px) { .cx-scope { grid-template-columns: 1fr; } }
.cx-field { display: flex; flex-direction: column; gap: 6px; }
.cx-lab { font-size: 10.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--as-text-dim); }
.cx-hint { display: flex; align-items: flex-start; gap: 6px; margin: 0; font-size: 11px; line-height: 1.5; color: var(--as-text-dim); }
.cx-hint :deep(svg) { flex-shrink: 0; margin-top: 1px; color: var(--a); }

/* format segmented */
.cx-fmts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }
@media (max-width: 480px) { .cx-fmts { grid-template-columns: 1fr; } }
.cx-fmt { position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 5px; padding: 12px 13px; border-radius: 13px;
  cursor: pointer; font: inherit; text-align: left; color: var(--as-text-secondary);
  background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: border-color 0.22s, background 0.22s; }
.cx-fmt:hover { border-color: var(--as-border-strong); }
.cx-fmt.on { color: var(--as-text); background: color-mix(in srgb, var(--a) 10%, transparent); border-color: color-mix(in srgb, var(--a) 50%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--a) 12%, transparent); }
.cx-fmt-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; color: var(--a);
  background: color-mix(in srgb, var(--a) 13%, transparent); border: 1px solid color-mix(in srgb, var(--a) 26%, transparent); }
.cx-fmt-l { font-size: 13px; font-weight: 800; }
.cx-fmt-b { font-size: 10.5px; color: var(--as-text-dim); }
.cx-fmt-tick { position: absolute; top: 11px; right: 11px; color: var(--a); }

.as-btn.disabled { opacity: 0.55; cursor: wait; }
.spin { animation: as-spin 0.9s linear infinite; }
</style>
