<template>
  <div class="asd">
    <!-- header / progress -->
    <div class="asd-head">
      <div class="asd-progress">
        <div class="asd-prog-top">
          <span class="asd-prog-tag"><ScanLine :size="13" /> {{ readOnly ? 'Reconciliation' : 'Mustering' }}</span>
          <span class="asd-prog-count"><b>{{ scannedCount }}</b> / {{ items.length }} scanned</span>
        </div>
        <div class="asd-bar"><span class="asd-bar-fill" :style="{ width: coverage + '%' }"><span v-if="!readOnly && coverage < 100" class="asd-bar-sheen" /></span></div>
        <div class="asd-chips">
          <span v-for="r in RESULTS" :key="r.v" class="asd-mini" :data-r="r.v"><i />{{ tally[r.v] || 0 }} {{ r.l }}</span>
          <span class="asd-mini" data-r="PENDING"><i />{{ tally.PENDING || 0 }} pending</span>
        </div>
      </div>
      <AuditReconRing :counts="reconCounts" :size="86" :thickness="9" :live="!readOnly" label="counted" />
    </div>

    <!-- toolbar -->
    <div class="asd-tools">
      <div class="asd-search">
        <Search :size="14" />
        <input v-model="q" :placeholder="`Search ${items.length} assets…`" />
      </div>
      <Motion v-if="!readOnly && (tally.PENDING || 0) > 0" as="button" type="button" class="as-btn as-btn-steel mini"
        :class="{ disabled: bulkBusy }" :whileHover="bulkBusy ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.96 }"
        :disabled="bulkBusy" @click="$emit('scan-all-found')">
        <Loader v-if="bulkBusy" :size="13" class="spin" /><SquareCheck v-else :size="13" />
        {{ bulkBusy ? 'Marking…' : `Mark rest found (${tally.PENDING})` }}
      </Motion>
    </div>

    <!-- list -->
    <div v-if="loading" class="asd-list">
      <div v-for="n in 6" :key="n" class="as-skel" style="height:50px;border-radius:12px" />
    </div>
    <div v-else-if="!filtered.length" class="asd-empty">
      <ScanSearch :size="22" />
      <span>{{ items.length ? 'No assets match that search.' : 'No items snapshotted in this count.' }}</span>
    </div>
    <ul v-else class="asd-list">
      <Motion v-for="(it, i) in filtered" :key="it.id" as="li" class="asd-row" :data-r="it.result" :data-scanned="it.result !== 'PENDING'"
        :initial="reduced ? false : { opacity: 0, x: -8 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.3, delay: Math.min(i * 0.018, 0.4) }">
        <span class="asd-row-rail" aria-hidden="true" />
        <button type="button" class="asd-expect" :title="`Open history · ${it.asset_code}`" @click="$emit('detail', it.asset_id)">
          <span class="asd-code as-mono">{{ it.asset_code }}</span>
          <span class="asd-exp">expected <b>{{ titleCase(it.expected_status || '—') }}</b></span>
        </button>

        <template v-if="!readOnly">
          <div class="asd-opts">
            <Motion v-for="r in RESULTS" :key="r.v" as="button" type="button" class="asd-opt" :data-r="r.v"
              :class="{ on: it.result === r.v }" :whileHover="{ y: -1 }" :whileTap="{ scale: 0.94 }" @click="onResult(it, r.v)">
              <component :is="r.icon" :size="13" /><span>{{ r.l }}</span>
            </Motion>
            <button type="button" class="asd-expand" :class="{ open: expanded === it.id }" :disabled="it.result === 'PENDING'"
              :title="it.result === 'PENDING' ? 'Pick a result first' : 'Condition & remarks'" @click="toggleExpand(it)">
              <ChevronDown :size="14" />
            </button>
          </div>
        </template>
        <template v-else>
          <AsStamp v-if="it.result !== 'PENDING'" :value="it.result" />
          <span v-else class="asd-pendtag">Not scanned</span>
          <span v-if="it.found_condition" class="asd-cond">{{ titleCase(it.found_condition) }}</span>
        </template>

        <!-- detail drawer (condition + remarks) -->
        <transition name="asd-exp">
          <div v-if="!readOnly && expanded === it.id" class="asd-detail">
            <div class="asd-detail-grid">
              <label class="asd-det-field">
                <span>Found condition</span>
                <AsSelect v-model="draft.condition" :options="conditionOptions" placeholder="(unchanged)" />
              </label>
              <label class="asd-det-field">
                <span>Remarks</span>
                <input v-model="draft.remarks" class="asd-input" placeholder="Note any discrepancy…" />
              </label>
            </div>
            <div class="asd-detail-foot">
              <span v-if="it.result === 'DAMAGED'" class="asd-dmg-hint">
                <ShieldAlert :size="12" /> Found damaged?
                <button type="button" @click="$emit('go', 'damage')">Log a damage report →</button>
              </span>
              <span v-else />
              <Motion as="button" type="button" class="as-btn as-btn-primary mini" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="saveDetail(it)">
                <Check :size="13" /> Save details
              </Motion>
            </div>
          </div>
        </transition>
      </Motion>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import {
  ScanLine, ScanSearch, Search, Loader, SquareCheck, ChevronDown, Check,
  CircleCheck, TriangleAlert, ShieldAlert, CircleX,
} from 'lucide-vue-next'
import AuditReconRing from './AuditReconRing.vue'
import AsStamp from './AsStamp.vue'
import AsSelect from './AsSelect.vue'
import { ASSET_CONDITIONS, titleCase } from '@/composables/useAssets'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  audit: { type: Object, default: null },
  items: { type: Array, default: () => [] },
  readOnly: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  bulkBusy: { type: Boolean, default: false },
})
const emit = defineEmits(['scan', 'scan-all-found', 'detail', 'go'])

const reduced = prefersReduced()
const RESULTS = [
  { v: 'FOUND', l: 'Found', icon: CircleCheck },
  { v: 'MISMATCH', l: 'Mismatch', icon: TriangleAlert },
  { v: 'DAMAGED', l: 'Damaged', icon: ShieldAlert },
  { v: 'MISSING', l: 'Missing', icon: CircleX },
]
const conditionOptions = ASSET_CONDITIONS.map(c => ({ value: c, label: titleCase(c) }))

const q = ref('')
const filtered = computed(() => {
  const term = q.value.trim().toLowerCase()
  if (!term) return props.items
  return props.items.filter(it => (it.asset_code || '').toLowerCase().includes(term))
})

const tally = computed(() => {
  const t = { FOUND: 0, MISMATCH: 0, DAMAGED: 0, MISSING: 0, PENDING: 0 }
  for (const it of props.items) t[it.result] = (t[it.result] || 0) + 1
  return t
})
const scannedCount = computed(() => props.items.length - (tally.value.PENDING || 0))
const coverage = computed(() => props.items.length ? Math.round((scannedCount.value / props.items.length) * 100) : 0)
const reconCounts = computed(() => ({
  found: tally.value.FOUND || 0, mismatch: tally.value.MISMATCH || 0, damaged: tally.value.DAMAGED || 0,
  missing: tally.value.MISSING || 0, pending: tally.value.PENDING || 0,
}))

const expanded = ref(null)
const draft = ref({ condition: '', remarks: '' })
function toggleExpand(it) {
  if (it.result === 'PENDING') return
  if (expanded.value === it.id) { expanded.value = null; return }
  expanded.value = it.id
  draft.value = { condition: it.found_condition || '', remarks: it.remarks || '' }
}
function onResult(it, result) {
  emit('scan', { item: it, body: { result } })
}
function saveDetail(it) {
  emit('scan', { item: it, body: { result: it.result, found_condition: draft.value.condition || null, remarks: draft.value.remarks || null } })
  expanded.value = null
}
</script>

<style scoped>
.asd { display: flex; flex-direction: column; gap: 14px; }

/* header */
.asd-head { display: flex; align-items: center; gap: 16px; padding: 14px 16px; border-radius: 15px;
  background: var(--as-surf-card); border: 1px solid var(--as-border-soft); box-shadow: var(--as-card-shadow); }
.asd-progress { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
.asd-prog-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.asd-prog-tag { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--as-text-secondary); }
.asd-prog-tag :deep(svg) { color: var(--as-amber); }
.asd-prog-count { font-size: 12px; color: var(--as-text-muted); font-variant-numeric: tabular-nums; }
.asd-prog-count b { color: var(--as-text); font-weight: 800; }
.asd-bar { position: relative; height: 8px; border-radius: 5px; background: var(--as-surface); overflow: hidden; border: 1px solid var(--as-border-soft); }
.asd-bar-fill { position: relative; display: block; height: 100%; border-radius: 5px; overflow: hidden;
  background: linear-gradient(90deg, var(--as-st-available), var(--as-amber)); transition: width 0.6s var(--as-spring); }
.asd-bar-sheen { position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent); background-size: 200% 100%; animation: as-sheen 1.6s ease infinite; }
.asd-chips { display: flex; flex-wrap: wrap; gap: 10px; }
.asd-mini { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 600; color: var(--as-text-muted); font-variant-numeric: tabular-nums; }
.asd-mini i { width: 8px; height: 8px; border-radius: 2px; }
.asd-mini[data-r="FOUND"] i { background: var(--as-st-available); }
.asd-mini[data-r="MISMATCH"] i { background: var(--as-st-reserved); }
.asd-mini[data-r="DAMAGED"] i { background: var(--as-al-damaged); }
.asd-mini[data-r="MISSING"] i { background: var(--as-al-lost); }
.asd-mini[data-r="PENDING"] i { background: var(--as-steel-dim); }

/* toolbar */
.asd-tools { display: flex; align-items: center; gap: 10px; }
.asd-search { flex: 1; display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 11px; background: var(--as-surface); border: 1px solid var(--as-border-soft); color: var(--as-text-dim); }
.asd-search:focus-within { border-color: color-mix(in srgb, var(--as-amber) 55%, transparent); }
.asd-search input { flex: 1; min-width: 0; border: none; background: none; outline: none; font: inherit; font-size: 13px; color: var(--as-text); }
.as-btn.mini { padding: 8px 13px; font-size: 12.5px; }
.as-btn.disabled { opacity: 0.6; cursor: not-allowed; }

/* list */
.asd-list { list-style: none; margin: 0; padding: 2px; display: flex; flex-direction: column; gap: 8px; max-height: 48vh; overflow-y: auto; }
.asd-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 36px; color: var(--as-text-muted); font-size: 13px; }
.asd-empty :deep(svg) { color: var(--as-text-dim); }

.asd-row { position: relative; display: flex; align-items: center; flex-wrap: wrap; gap: 10px; padding: 10px 13px 10px 15px; border-radius: 13px;
  background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: border-color 0.25s, background 0.25s; }
.asd-row[data-scanned="true"] { background: color-mix(in srgb, var(--rc, var(--as-amber)) 6%, var(--as-surface)); }
.asd-row[data-r="FOUND"]    { --rc: var(--as-st-available); }
.asd-row[data-r="MISMATCH"] { --rc: var(--as-st-reserved); }
.asd-row[data-r="DAMAGED"]  { --rc: var(--as-al-damaged); }
.asd-row[data-r="MISSING"]  { --rc: var(--as-al-lost); }
.asd-row-rail { position: absolute; left: 0; top: 8px; bottom: 8px; width: 3px; border-radius: 3px; background: var(--rc, transparent);
  opacity: 0; transition: opacity 0.3s; }
.asd-row[data-scanned="true"] .asd-row-rail { opacity: 0.85; }
.asd-expect { flex: 1; min-width: 120px; display: flex; flex-direction: column; gap: 1px; text-align: left; background: none; border: 0; cursor: pointer; padding: 0; }
.asd-code { font-size: 13.5px; font-weight: 800; color: var(--as-text); transition: color 0.2s; }
.asd-expect:hover .asd-code { color: var(--as-amber); }
.asd-exp { font-size: 10.5px; color: var(--as-text-dim); }
.asd-exp b { color: var(--as-text-muted); font-weight: 700; }

.asd-opts { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
.asd-opt { display: inline-flex; align-items: center; gap: 5px; padding: 6px 10px; border-radius: 9px; cursor: pointer; font: inherit; font-size: 11.5px; font-weight: 700;
  color: var(--as-text-muted); background: var(--as-panel); border: 1px solid var(--as-border-soft); transition: color 0.16s, background 0.16s, border-color 0.16s; }
.asd-opt :deep(svg) { opacity: 0.7; }
.asd-opt:hover { color: var(--as-text); border-color: var(--as-border-strong); }
.asd-opt[data-r="FOUND"].on    { color: var(--as-st-available); background: var(--as-st-available-soft); border-color: color-mix(in srgb, var(--as-st-available) 40%, transparent); }
.asd-opt[data-r="MISMATCH"].on { color: var(--as-st-reserved); background: var(--as-st-reserved-soft); border-color: color-mix(in srgb, var(--as-st-reserved) 40%, transparent); }
.asd-opt[data-r="DAMAGED"].on  { color: var(--as-al-damaged); background: var(--as-al-damaged-soft); border-color: color-mix(in srgb, var(--as-al-damaged) 40%, transparent); }
.asd-opt[data-r="MISSING"].on  { color: var(--as-al-lost); background: var(--as-al-lost-soft); border-color: color-mix(in srgb, var(--as-al-lost) 40%, transparent); }
.asd-opt.on :deep(svg) { opacity: 1; }
.asd-expand { display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; cursor: pointer; color: var(--as-text-muted);
  background: var(--as-panel); border: 1px solid var(--as-border-soft); transition: all 0.2s; }
.asd-expand:hover:not(:disabled) { color: var(--as-amber); border-color: color-mix(in srgb, var(--as-amber) 38%, transparent); }
.asd-expand:disabled { opacity: 0.4; cursor: not-allowed; }
.asd-expand.open { transform: rotate(180deg); color: var(--as-amber); }

.asd-pendtag { font-size: 11px; font-weight: 600; color: var(--as-text-dim); }
.asd-cond { font-size: 11px; color: var(--as-text-muted); }

/* detail drawer */
.asd-detail { flex: 1 0 100%; display: flex; flex-direction: column; gap: 10px; margin-top: 4px; padding: 12px; border-radius: 11px;
  background: var(--as-panel); border: 1px solid var(--as-border-soft); }
.asd-detail-grid { display: grid; grid-template-columns: 0.8fr 1.2fr; gap: 10px; }
@media (max-width: 540px) { .asd-detail-grid { grid-template-columns: 1fr; } }
.asd-det-field { display: flex; flex-direction: column; gap: 5px; }
.asd-det-field > span { font-size: 10px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--as-text-dim); }
.asd-input { width: 100%; box-sizing: border-box; font: inherit; font-size: 13px; color: var(--as-text); background: var(--as-surface); border: 1px solid var(--as-border-soft); border-radius: 10px; padding: 9px 11px; transition: border-color 0.2s, box-shadow 0.2s; }
.asd-input:focus { outline: none; border-color: color-mix(in srgb, var(--as-amber) 55%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--as-amber) 12%, transparent); }
.asd-detail-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.asd-dmg-hint { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--as-al-damaged); }
.asd-dmg-hint button { background: none; border: 0; cursor: pointer; font: inherit; font-size: 11.5px; font-weight: 700; color: var(--as-al-damaged); text-decoration: underline; padding: 0; }

.spin { animation: as-spin 0.9s linear infinite; }

.asd-exp-enter-active, .asd-exp-leave-active { transition: opacity 0.24s var(--as-ease), transform 0.24s var(--as-ease); }
.asd-exp-enter-from, .asd-exp-leave-to { opacity: 0; transform: translateY(-6px); }

@media (prefers-reduced-motion: reduce) { .asd-bar-sheen { animation: none; } }
</style>
