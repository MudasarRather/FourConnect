<template>
  <Motion as="section" class="ac" ref="root"
    :initial="reduced ? false : { opacity: 0, y: 16 }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
    <span class="as-grain" aria-hidden="true" />
    <span class="ac-aura" aria-hidden="true" />
    <span class="as-blueprint-floor" aria-hidden="true" />
    <span class="ac-crosshair" aria-hidden="true"><Crosshair :size="300" :stroke-width="0.5" /></span>

    <div class="ac-top">
      <div class="ac-lead">
        <span class="ac-eyebrow"><ScanSearch :size="13" /> Census Deck · Reconciliation Control</span>
        <h1 class="ac-title">Count Every <span class="ac-title-accent">Unit</span></h1>
        <p class="ac-sub">Muster the fleet against the books — scan each asset, reconcile found, mismatched and missing, and close the count clean.</p>
        <div class="ac-cta">
          <Motion as="button" type="button" class="as-btn as-btn-primary"
            :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('new')">
            <Plus :size="14" /> New audit
          </Motion>
          <Motion as="button" type="button" class="as-btn as-btn-steel"
            :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('go', 'inventory')">
            <Boxes :size="14" /> Fleet bay
          </Motion>
          <Motion as="button" type="button" class="as-btn as-btn-ghost"
            :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" @click="$emit('go', 'history')">
            <History :size="14" /> Movement log
          </Motion>
        </div>
      </div>

      <div class="ac-lenses" ref="lensesEl">
        <Motion v-for="(l, i) in lenses" :key="l.key" as="button" type="button" class="ac-lens"
          :class="{ on: l.status && activeStatus === l.status, stat: !l.status }" :data-tone="l.tone"
          :initial="reduced ? false : { opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.4, delay: 0.06 * i, ease: [0.16, 1, 0.3, 1] }"
          :whileHover="l.status ? { y: -3 } : {}" :whileTap="l.status ? { scale: 0.97 } : {}"
          :title="l.hint" @click="l.status && $emit('pick', l.status)">
          <span class="ac-lens-ic"><component :is="l.icon" :size="15" /></span>
          <span class="ac-lens-val"><AssetCountUp :value="l.value" :start="lensesIn" :duration="1.0 + i * 0.07" :suffix="l.suffix || ''" /></span>
          <span class="ac-lens-lab">{{ l.label }}</span>
          <span v-if="l.live && l.value" class="ac-lens-live" aria-hidden="true" />
        </Motion>
      </div>
    </div>

    <!-- ════ The Muster — matrix + reconciliation ring ════ -->
    <div class="ac-muster" ref="musterEl">
      <div class="ac-matrix-wrap">
        <div class="ac-matrix-head">
          <span class="ac-mh-tag"><Radar :size="13" /> Live muster matrix</span>
          <span class="ac-mh-meta">{{ scanned }} / {{ expected }} reconciled</span>
        </div>
        <AuditScanGrid :counts="recon" :cell="16" :max="160" :live="hasActive" class="ac-matrix" />
        <div class="ac-legend">
          <span v-for="lg in legend" :key="lg.k" class="ac-leg" :data-k="lg.k">
            <i /><b>{{ lg.v }}</b>{{ lg.l }}
          </span>
        </div>
      </div>
      <div class="ac-ringwrap">
        <AuditReconRing :counts="recon" :size="132" :live="hasActive" label="reconciled" />
        <span class="ac-ring-cap">{{ foundRate }}% clean · {{ exceptions }} exceptions</span>
      </div>
    </div>
  </Motion>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Motion } from 'motion-v'
import {
  ScanSearch, Plus, Boxes, History, Crosshair, Radar,
  ClipboardList, ScanLine, CircleCheck, Ban,
} from 'lucide-vue-next'
import AuditScanGrid from './AuditScanGrid.vue'
import AuditReconRing from './AuditReconRing.vue'
import AssetCountUp from './AssetCountUp.vue'
import { prefersReduced, useInView } from '@/composables/useShiftMotion'

const props = defineProps({
  counts: { type: Object, default: () => ({ draft: 0, inProgress: 0, completed: 0, cancelled: 0, total: 0 }) },
  recon: { type: Object, default: () => ({ found: 0, mismatch: 0, damaged: 0, missing: 0, pending: 0 }) },
  activeStatus: { type: String, default: '' },
})
defineEmits(['pick', 'new', 'go'])

const root = ref(null)
const lensesEl = ref(null)
const musterEl = ref(null)
const reduced = prefersReduced()
const { visible: lensesIn } = useInView(lensesEl, { threshold: 0.2 })

const c = computed(() => props.counts || {})
const r = computed(() => props.recon || {})
const hasActive = computed(() => (c.value.inProgress || 0) > 0)

const expected = computed(() => ['found', 'mismatch', 'damaged', 'missing', 'pending'].reduce((s, k) => s + Number(r.value[k] || 0), 0))
const scanned = computed(() => ['found', 'mismatch', 'damaged', 'missing'].reduce((s, k) => s + Number(r.value[k] || 0), 0))
const exceptions = computed(() => Number(r.value.mismatch || 0) + Number(r.value.damaged || 0) + Number(r.value.missing || 0))
const foundRate = computed(() => scanned.value ? Math.round((Number(r.value.found || 0) / scanned.value) * 100) : 0)

const lenses = computed(() => [
  { key: 'draft', status: 'DRAFT', label: 'Drafts', value: c.value.draft || 0, tone: 'draft', icon: ClipboardList, hint: 'Planned, not yet started' },
  { key: 'prog', status: 'IN_PROGRESS', label: 'Mustering', value: c.value.inProgress || 0, tone: 'prog', icon: ScanLine, live: true, hint: 'Counts in progress' },
  { key: 'done', status: 'COMPLETED', label: 'Closed', value: c.value.completed || 0, tone: 'done', icon: CircleCheck, hint: 'Reconciled & closed' },
  { key: 'canc', status: 'CANCELLED', label: 'Cancelled', value: c.value.cancelled || 0, tone: 'canc', icon: Ban, hint: 'Abandoned counts' },
  { key: 'exc', status: '', label: 'Exceptions', value: exceptions.value, tone: 'exc', icon: Radar, hint: 'Mismatch + damaged + missing across all counts' },
])

const legend = computed(() => [
  { k: 'found', l: 'found', v: r.value.found || 0 },
  { k: 'mismatch', l: 'mismatch', v: r.value.mismatch || 0 },
  { k: 'damaged', l: 'damaged', v: r.value.damaged || 0 },
  { k: 'missing', l: 'missing', v: r.value.missing || 0 },
  { k: 'pending', l: 'pending', v: r.value.pending || 0 },
])
</script>

<style scoped>
.ac { position: relative; overflow: hidden; border-radius: 24px; padding: 24px 26px 22px;
  border: 1px solid var(--as-border-soft); background: var(--as-dome); box-shadow: var(--as-card-shadow); }
.ac-aura { position: absolute; inset: -45% -15% auto -15%; height: 85%; pointer-events: none; z-index: 0; background: var(--as-grad-hero); filter: blur(10px); }
.ac-crosshair { position: absolute; top: -70px; right: -60px; pointer-events: none; z-index: 0; color: var(--as-amber); opacity: 0.07; animation: ac-rotate 90s linear infinite; }
[data-theme="light"] .ac-crosshair { opacity: 0.1; }

.ac-top { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: 26px; flex-wrap: wrap; }
.ac-lead { max-width: 470px; min-width: 270px; flex: 1; }
.ac-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--as-amber); padding: 5px 11px; border-radius: 999px; background: color-mix(in srgb, var(--as-amber) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--as-amber) 26%, transparent); }
.ac-title { margin: 14px 0 0; font-size: clamp(26px, 3.4vw, 38px); font-weight: 850; letter-spacing: -0.02em; color: var(--as-text); line-height: 1.04; }
.ac-title-accent { background: var(--as-grad-rail); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.ac-sub { margin: 9px 0 0; font-size: 13.5px; line-height: 1.6; color: var(--as-text-muted); max-width: 440px; }
.ac-cta { display: flex; gap: 9px; margin-top: 16px; flex-wrap: wrap; }

.ac-lenses { display: grid; grid-template-columns: repeat(5, minmax(74px, 1fr)); gap: 9px; min-width: 0; }
.ac-lens { position: relative; display: flex; flex-direction: column; gap: 2px; padding: 12px 12px 11px; border-radius: 15px; text-align: left; cursor: pointer;
  background: var(--as-panel); border: 1px solid var(--as-border-soft); backdrop-filter: blur(8px); transition: border-color 0.25s, box-shadow 0.25s, transform 0.25s; overflow: hidden; }
.ac-lens.stat { cursor: default; }
.ac-lens::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 2px; opacity: 0.85; background: linear-gradient(90deg, transparent, var(--lc, var(--as-amber)), transparent); }
.ac-lens:hover { border-color: var(--as-border-strong); box-shadow: var(--as-card-shadow-hover); }
.ac-lens.on { border-color: color-mix(in srgb, var(--lc) 55%, transparent); box-shadow: 0 0 0 1px color-mix(in srgb, var(--lc) 30%, transparent), var(--as-card-shadow-hover); }
.ac-lens[data-tone="draft"] { --lc: var(--as-st-reserved); }
.ac-lens[data-tone="prog"]  { --lc: var(--as-amber); }
.ac-lens[data-tone="done"]  { --lc: var(--as-st-available); }
.ac-lens[data-tone="canc"]  { --lc: var(--as-st-retired); }
.ac-lens[data-tone="exc"]   { --lc: var(--as-al-lost); }
.ac-lens-ic { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; color: var(--lc); background: color-mix(in srgb, var(--lc) 14%, transparent); }
.ac-lens-val { font-size: 22px; font-weight: 850; color: var(--as-text); margin-top: 7px; line-height: 1; }
.ac-lens-lab { font-size: 10px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--as-text-dim); margin-top: 3px; }
.ac-lens-live { position: absolute; top: 11px; right: 11px; width: 7px; height: 7px; border-radius: 50%; background: var(--as-amber);
  box-shadow: 0 0 0 0 color-mix(in srgb, var(--as-amber) 60%, transparent); animation: ac-live 1.7s ease-in-out infinite; }

/* ════ muster ════ */
.ac-muster { position: relative; z-index: 1; margin-top: 24px; display: grid; grid-template-columns: 1fr auto; gap: 18px; align-items: stretch;
  padding: 16px 18px; border-radius: 18px; background: linear-gradient(180deg, color-mix(in srgb, var(--as-surface-elevated) 70%, transparent), var(--as-surface));
  border: 1px solid var(--as-border-soft); }
.ac-matrix-wrap { min-width: 0; display: flex; flex-direction: column; gap: 10px; }
.ac-matrix-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.ac-mh-tag { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--as-text-secondary); }
.ac-mh-tag :deep(svg) { color: var(--as-amber); }
.ac-mh-meta { font-size: 11.5px; font-weight: 700; color: var(--as-text-muted); font-variant-numeric: tabular-nums; }
.ac-matrix { flex: 1; min-height: 96px; }
.ac-legend { display: flex; flex-wrap: wrap; gap: 12px; }
.ac-leg { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; letter-spacing: 0.03em; text-transform: uppercase; color: var(--as-text-dim); }
.ac-leg i { width: 9px; height: 9px; border-radius: 3px; }
.ac-leg b { font-weight: 800; color: var(--as-text); font-variant-numeric: tabular-nums; }
.ac-leg[data-k="found"] i { background: var(--as-st-available); }
.ac-leg[data-k="mismatch"] i { background: var(--as-st-reserved); }
.ac-leg[data-k="damaged"] i { background: var(--as-al-damaged); }
.ac-leg[data-k="missing"] i { background: var(--as-al-lost); }
.ac-leg[data-k="pending"] i { background: var(--as-steel-dim); }

.ac-ringwrap { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding-left: 18px; border-left: 1px dashed var(--as-border-strong); }
.ac-ring-cap { font-size: 10.5px; font-weight: 700; color: var(--as-text-muted); text-align: center; max-width: 150px; }

@keyframes ac-rotate { to { transform: rotate(360deg); } }
@keyframes ac-live { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--as-amber) 55%, transparent); } 50% { box-shadow: 0 0 0 6px color-mix(in srgb, var(--as-amber) 0%, transparent); } }

@media (max-width: 1080px) {
  .ac-lenses { grid-template-columns: repeat(5, 1fr); width: 100%; }
}
@media (max-width: 760px) {
  .ac-muster { grid-template-columns: 1fr; }
  .ac-ringwrap { border-left: 0; border-top: 1px dashed var(--as-border-strong); padding: 14px 0 0; flex-direction: row; }
  .ac-lenses { grid-template-columns: repeat(3, 1fr); }
}
@media (prefers-reduced-motion: reduce) { .ac-crosshair, .ac-lens-live { animation: none; } }
</style>
