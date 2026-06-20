<template>
  <article class="acc-shell" :style="{ '--i': index }">
    <div ref="cardEl" class="acc" :data-status="audit.status">
      <span class="acc-glare" aria-hidden="true" />
      <span class="acc-spine" aria-hidden="true" />
      <span v-if="audit.status === 'IN_PROGRESS'" class="acc-edge" aria-hidden="true" />

      <header class="acc-head">
        <div class="acc-id">
          <span class="acc-name">{{ audit.name }}</span>
          <span class="acc-scope">
            <component :is="scope.icon" :size="11" /> {{ scope.label }}
          </span>
        </div>
        <AsStamp :value="audit.status" />
      </header>

      <div class="acc-body">
        <div class="acc-ring">
          <AuditReconRing :counts="reconCounts" :size="78" :thickness="9" :live="audit.status === 'IN_PROGRESS'" label="counted" />
        </div>
        <div class="acc-mid">
          <AuditScanGrid :counts="reconCounts" :cell="11" :gap="3" :max="56" :live="audit.status === 'IN_PROGRESS'" class="acc-grid" />
          <div class="acc-tally">
            <span class="acc-t" data-k="exp"><b>{{ audit.total_expected }}</b>expected</span>
            <span class="acc-t" data-k="found"><b>{{ audit.total_found }}</b>found</span>
            <span class="acc-t" data-k="mis"><b>{{ audit.total_mismatched }}</b>mismatch</span>
            <span class="acc-t" data-k="miss"><b>{{ audit.total_missing }}</b>missing</span>
          </div>
        </div>
      </div>

      <div class="acc-dates">
        <span v-for="d in dates" :key="d.k" class="acc-date"><component :is="d.icon" :size="11" /><em>{{ d.l }}</em><b>{{ d.v }}</b></span>
      </div>

      <footer class="acc-foot">
        <Motion v-if="audit.status === 'DRAFT'" as="button" type="button" class="as-btn as-btn-primary mini"
          :whileHover="{ y: -2, scale: 1.03 }" :whileTap="{ scale: 0.96 }" @click="$emit('action', 'start')"><Play :size="13" /> Start count</Motion>
        <Motion v-if="audit.status === 'IN_PROGRESS'" as="button" type="button" class="as-btn as-btn-primary mini"
          :whileHover="{ y: -2, scale: 1.03 }" :whileTap="{ scale: 0.96 }" @click="$emit('scan')"><ScanLine :size="13" /> Scan</Motion>
        <Motion v-if="audit.status === 'IN_PROGRESS'" as="button" type="button" class="as-btn as-btn-steel mini"
          :whileHover="{ y: -2, scale: 1.03 }" :whileTap="{ scale: 0.96 }" @click="$emit('action', 'complete')"><CircleCheck :size="13" /> Close</Motion>
        <Motion v-if="audit.status === 'COMPLETED'" as="button" type="button" class="as-btn as-btn-ghost mini"
          :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="$emit('scan')"><Eye :size="13" /> Review</Motion>
        <Motion v-if="['DRAFT','IN_PROGRESS'].includes(audit.status)" as="button" type="button" class="as-btn as-btn-ghost mini"
          :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="$emit('action', 'cancel')"><Ban :size="13" /> Cancel</Motion>
        <span v-if="audit.status === 'CANCELLED'" class="acc-terminal"><Ban :size="13" /> Cancelled</span>
      </footer>
    </div>
  </article>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Motion } from 'motion-v'
import {
  Play, ScanLine, CircleCheck, Eye, Ban, Boxes, MapPin, Building2, FolderTree,
  CalendarClock, Flag,
} from 'lucide-vue-next'
import AuditReconRing from './AuditReconRing.vue'
import AuditScanGrid from './AuditScanGrid.vue'
import AsStamp from './AsStamp.vue'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({
  audit: { type: Object, required: true },
  index: { type: Number, default: 0 },
  scopeLabel: { type: String, default: '' },   // resolved name from parent (location/dept/category)
  scopeKind: { type: String, default: '' },     // 'location' | 'department' | 'category' | ''
})
defineEmits(['action', 'scan'])

const cardEl = ref(null)
usePointerSpotlight(cardEl)

const reconCounts = computed(() => {
  const a = props.audit
  const found = a.total_found || 0
  const mismatch = a.total_mismatched || 0   // backend lumps DAMAGED into mismatched
  const missing = a.total_missing || 0
  const pending = Math.max(0, (a.total_expected || 0) - found - mismatch - missing)
  return { found, mismatch, damaged: 0, missing, pending }
})

const SCOPE_ICON = { location: MapPin, department: Building2, category: FolderTree }
const scope = computed(() => ({
  icon: SCOPE_ICON[props.scopeKind] || Boxes,
  label: props.scopeLabel || 'All assets',
}))

function fmt(d) {
  if (!d) return ''
  try { return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) }
  catch { return d }
}
const dates = computed(() => {
  const a = props.audit
  return [
    { k: 'sch', l: 'Scheduled', v: fmt(a.scheduled_date), icon: CalendarClock, raw: a.scheduled_date },
    { k: 'sta', l: 'Started', v: fmt(a.started_at), icon: ScanLine, raw: a.started_at },
    { k: 'com', l: 'Closed', v: fmt(a.completed_at), icon: Flag, raw: a.completed_at },
  ].filter(d => d.raw)
})
</script>

<style scoped>
.acc-shell { min-width: 0; animation: as-deal 0.5s var(--as-spring) both; animation-delay: calc(var(--i, 0) * 0.045s); }
.acc { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 12px; padding: 15px 16px 14px 19px; border-radius: 18px;
  background: var(--as-surf-card); border: 1px solid var(--as-border-soft); box-shadow: var(--as-card-shadow);
  transform: perspective(1100px) rotateX(0) rotateY(0); transform-style: preserve-3d;
  transition: transform 0.4s var(--as-spring), box-shadow 0.4s var(--as-spring), border-color 0.3s; }
.acc:hover { border-color: var(--as-border-strong); box-shadow: var(--as-card-shadow-hover);
  transform: perspective(1100px) rotateX(calc((var(--my, 0.5) - 0.5) * -6deg)) rotateY(calc((var(--mx, 0.5) - 0.5) * 8deg)) translateY(-2px); }
.acc-glare { position: absolute; inset: 0; pointer-events: none; z-index: 3; opacity: var(--spot, 0); transition: opacity 0.4s ease;
  background: radial-gradient(320px 240px at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), color-mix(in srgb, var(--lc, var(--as-amber)) 15%, transparent), transparent 60%); }

.acc[data-status="DRAFT"]       { --lc: var(--as-st-reserved); }
.acc[data-status="IN_PROGRESS"] { --lc: var(--as-amber); }
.acc[data-status="COMPLETED"]   { --lc: var(--as-st-available); }
.acc[data-status="CANCELLED"]   { --lc: var(--as-st-retired); }
.acc-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: linear-gradient(180deg, var(--lc), color-mix(in srgb, var(--lc) 30%, transparent)); box-shadow: 0 0 14px -2px var(--lc); }
.acc-edge { position: absolute; top: 0; left: 0; right: 0; height: 2px; z-index: 2; pointer-events: none;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--as-amber) 80%, transparent), transparent); background-size: 220% 100%; animation: as-sheen 3.4s ease-in-out infinite; }

.acc-head { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.acc-id { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.acc-name { font-size: 14.5px; font-weight: 800; color: var(--as-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.acc-scope { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--as-text-muted); }
.acc-scope :deep(svg) { color: var(--as-steel-dim); }

.acc-body { position: relative; z-index: 1; display: flex; align-items: center; gap: 14px; }
.acc-ring { flex-shrink: 0; }
.acc-mid { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 9px; }
.acc-grid { min-height: 38px; }
.acc-tally { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; }
.acc-t { display: flex; flex-direction: column; align-items: center; gap: 1px; font-size: 8.5px; letter-spacing: 0.03em; text-transform: uppercase; color: var(--as-text-dim); }
.acc-t b { font-size: 15px; font-weight: 800; color: var(--as-text); font-variant-numeric: tabular-nums; }
.acc-t[data-k="found"] b { color: var(--as-st-available); }
.acc-t[data-k="mis"] b { color: var(--as-st-reserved); }
.acc-t[data-k="miss"] b { color: var(--as-al-lost); }

.acc-dates { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 6px; }
.acc-date { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; color: var(--as-text-muted);
  padding: 3px 8px; border-radius: 7px; background: color-mix(in srgb, var(--as-surface-elevated) 60%, transparent); border: 1px solid var(--as-border-soft); }
.acc-date :deep(svg) { color: var(--lc); opacity: 0.85; }
.acc-date em { font-style: normal; color: var(--as-text-dim); }
.acc-date b { font-weight: 700; color: var(--as-text-secondary); font-variant-numeric: tabular-nums; }

.acc-foot { position: relative; z-index: 1; display: flex; flex-wrap: wrap; align-items: center; gap: 7px; margin-top: 2px; }
.as-btn.mini { padding: 7px 12px; font-size: 12.5px; }
.acc-terminal { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--as-text-muted); }

@media (prefers-reduced-motion: reduce) {
  .acc-shell { animation: none; }
  .acc, .acc:hover { transform: none; }
  .acc-edge { animation: none; }
}
</style>
