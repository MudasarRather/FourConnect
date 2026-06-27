<template>
  <div class="rc-shell" :style="{ '--i': index }">
    <article ref="cardEl" class="rc" @click="$emit('open', review)">
      <span class="rc-glare" aria-hidden="true" />
      <span class="rc-spine" :style="{ background: statusColor }" aria-hidden="true" />

      <div class="rc-top">
        <div class="rc-score" :style="{ '--perf-p': ringDeg + 'deg', '--c': scoreColor }">
          <span v-if="score != null" class="rc-score-val">{{ score.toFixed(1) }}</span>
          <span v-else class="rc-score-step">{{ stepIdx }}/4</span>
        </div>
        <div class="rc-id">
          <b :title="review.employee_name">{{ review.employee_name || '—' }}</b>
          <span>{{ review.designation_name || review.employee_code || '' }}</span>
        </div>
        <PerfStatusStamp :status="review.status" size="sm" />
      </div>

      <!-- mini pipeline -->
      <div class="rc-pipe">
        <span v-for="(p, i) in PIPELINE" :key="p.key" class="rc-node" :class="nodeClass(i)" :title="p.label" />
      </div>

      <div class="rc-meta">
        <span class="rc-chip"><CalendarRange :size="11" />{{ review.period_label || review.cycle }}</span>
        <span class="rc-chip" :title="review.template_name"><FileText :size="11" />{{ review.template_code || 'rubric' }}</span>
        <span v-if="review.reviewer_name" class="rc-chip"><UserCheck :size="11" />{{ firstName(review.reviewer_name) }}</span>
        <span v-if="hike" class="rc-chip rc-hike" :style="{ '--hc': hike.color }" :title="`Increment ${hike.label}`"><component :is="hike.icon" :size="11" />{{ hikeLabel }}</span>
      </div>
    </article>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { CalendarRange, FileText, UserCheck } from 'lucide-vue-next'
import { usePointerSpotlight } from '@/composables/useShiftMotion'
import { statusMeta, scoreTone, hikeStatusMeta, PIPELINE, STATUS_ORDER } from '@/composables/usePerformance'
import PerfStatusStamp from './PerfStatusStamp.vue'

const props = defineProps({ review: { type: Object, required: true }, index: { type: Number, default: 0 } })
defineEmits(['open'])

const hike = computed(() => (props.review.hike_status && props.review.hike_status !== 'NONE') ? hikeStatusMeta(props.review.hike_status) : null)
const hikeLabel = computed(() => {
  const s = props.review.hike_status
  if (s === 'RECOMMENDED' && props.review.recommended_hike_pct != null) return `${props.review.recommended_hike_pct}%`
  if (s === 'APPLIED' && props.review.approved_hike_pct != null) return `+${props.review.approved_hike_pct}%`
  return hike.value?.label || ''
})

const cardEl = ref(null)
usePointerSpotlight(cardEl)

const max = computed(() => props.review.rating_max || 5)
const score = computed(() => props.review.overall_score ?? null)
const scoreColor = computed(() => scoreTone(score.value, max.value))
const statusColor = computed(() => statusMeta(props.review.status).color)
const ringDeg = computed(() => score.value != null ? Math.round((score.value / max.value) * 360) : 0)
const stepIdx = computed(() => Math.max(1, STATUS_ORDER.indexOf(props.review.status) + 1))
const nodeClass = (i) => {
  const cur = STATUS_ORDER.indexOf(props.review.status)
  if (props.review.status === 'CANCELLED') return 'cancel'
  if (i < cur) return 'done'
  if (i === cur) return 'active'
  return ''
}
const firstName = (n) => (n || '').split(/\s+/)[0]
</script>

<style scoped>
.rc-shell { animation: perf-deal 0.5s var(--perf-spring) both; animation-delay: calc(var(--i) * 0.04s); }
.rc { position: relative; overflow: hidden; cursor: pointer; padding: 13px 14px; border-radius: 15px; display: flex; flex-direction: column; gap: 11px;
  background: var(--perf-surface); border: 1px solid var(--perf-border); box-shadow: var(--perf-card-shadow);
  transition: transform 0.28s var(--perf-spring), border-color 0.28s, box-shadow 0.28s; --mx: 0.5; --my: 0.5; --spot: 0; }
.rc:hover { transform: perspective(1000px) rotateX(calc((var(--my) - 0.5) * -4deg)) rotateY(calc((var(--mx) - 0.5) * 6deg)) translateY(-2px);
  border-color: var(--perf-border-warm); box-shadow: var(--perf-card-shadow-hover); }
.rc-glare { position: absolute; inset: 0; z-index: 2; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(340px circle at calc(var(--mx) * 100%) calc(var(--my) * 100%), color-mix(in srgb, var(--perf-gold) 14%, transparent), transparent 45%); }
.rc-spine { position: absolute; left: 0; top: 12px; bottom: 12px; width: 3px; border-radius: 0 3px 3px 0; }

.rc-top { position: relative; z-index: 1; display: flex; align-items: center; gap: 11px; }
.rc-score { position: relative; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
  background: conic-gradient(var(--c) var(--perf-p, 0deg), var(--perf-track) 0); transition: --perf-p 0.8s var(--perf-spring); }
.rc-score::after { content: ''; position: absolute; inset: 4px; border-radius: 50%; background: var(--perf-surface); }
.rc-score-val, .rc-score-step { position: relative; z-index: 1; font-weight: 850; font-variant-numeric: tabular-nums; }
.rc-score-val { font-size: 14px; color: var(--perf-text); }
.rc-score-step { font-size: 11px; color: var(--perf-text-muted); }
.rc-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.rc-id b { font-size: 13px; font-weight: 800; color: var(--perf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rc-id span { font-size: 10.5px; color: var(--perf-text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.rc-pipe { position: relative; z-index: 1; display: flex; gap: 5px; }
.rc-node { flex: 1; height: 4px; border-radius: 999px; background: var(--perf-track); transition: background 0.3s; }
.rc-node.done { background: var(--perf-ok); }
.rc-node.active { background: var(--perf-gold); box-shadow: 0 0 8px color-mix(in srgb, var(--perf-gold) 60%, transparent); }
.rc-node.cancel { background: var(--perf-conflict); opacity: 0.4; }

.rc-meta { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 5px; }
.rc-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 7px; font-size: 10px; font-weight: 650;
  color: var(--perf-text-secondary); background: var(--perf-surface-elevated); border: 1px solid var(--perf-border); max-width: 130px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.rc-chip :deep(svg) { color: var(--perf-text-dim); flex-shrink: 0; }
.rc-hike { color: var(--hc); background: color-mix(in srgb, var(--hc) 12%, transparent); border-color: color-mix(in srgb, var(--hc) 28%, transparent); }
.rc-hike :deep(svg) { color: var(--hc); }

@media (prefers-reduced-motion: reduce) { .rc-shell { animation: none; } .rc:hover { transform: translateY(-2px); } }
</style>
