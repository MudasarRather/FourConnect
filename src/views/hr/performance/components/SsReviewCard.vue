<template>
  <div class="src-shell" :style="{ '--i': index }">
    <article ref="cardEl" class="src" :class="{ live: isLive }" @click="$emit('open', review)">
      <span class="src-glare" aria-hidden="true" />
      <span class="src-spine" :style="{ background: statusColor }" aria-hidden="true" />
      <span v-if="needsAck" class="src-flag" :title="'Awaiting your acknowledgement'"><Bell :size="11" /></span>

      <!-- top: score gauge + identity -->
      <div class="src-top">
        <div class="src-gauge" :style="{ '--perf-p': ringDeg + 'deg', '--c': scoreColor }">
          <div class="src-gauge-in">
            <span v-if="score != null" class="src-gauge-val">{{ score.toFixed(1) }}</span>
            <span v-else class="src-gauge-step">{{ stepIdx }}/4</span>
          </div>
        </div>
        <div class="src-id">
          <b :title="review.template_name">{{ review.template_name || 'Review' }}</b>
          <span>{{ review.period_label || review.cycle || '—' }}</span>
        </div>
        <PerfStatusStamp :status="review.status" size="sm" />
      </div>

      <!-- band + score word -->
      <div v-if="bandLabel || scoreWord" class="src-band-row">
        <span v-if="bandLabel" class="src-band" :style="{ '--c': bandColor }"><Award :size="11" /> {{ bandLabel }}</span>
        <span v-else-if="scoreWord" class="src-band ghost">{{ scoreWord }}</span>
      </div>

      <!-- mini pipeline -->
      <div class="src-pipe">
        <span v-for="(p, i) in PIPELINE" :key="p.key" class="src-node" :class="nodeClass(i)" :title="p.label" />
      </div>

      <!-- footer: reporting manager + increment -->
      <div class="src-foot">
        <span class="src-mgr" :title="'Reporting manager · ' + (review.reviewer_name || 'unassigned')">
          <span class="src-mgr-av">{{ initials(review.reviewer_name) }}</span>
          <span class="src-mgr-txt"><em>Reviewer</em><b>{{ review.reviewer_name || 'Unassigned' }}</b></span>
        </span>
        <span v-if="hike" class="src-hike" :style="{ '--hc': hike.color }" :title="`Increment ${hike.label}`">
          <component :is="hike.icon" :size="11" /> {{ hikeLabel }}
        </span>
      </div>
    </article>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Award, Bell } from 'lucide-vue-next'
import { usePointerSpotlight } from '@/composables/useShiftMotion'
import { statusMeta, scoreTone, bandTone, hikeStatusMeta, PIPELINE, STATUS_ORDER } from '@/composables/usePerformance'
import PerfStatusStamp from './PerfStatusStamp.vue'

const props = defineProps({ review: { type: Object, required: true }, index: { type: Number, default: 0 } })
defineEmits(['open'])

const cardEl = ref(null)
usePointerSpotlight(cardEl)

const max = computed(() => props.review.rating_max || 5)
const score = computed(() => props.review.overall_score ?? null)
const scoreColor = computed(() => scoreTone(score.value, max.value))
const statusColor = computed(() => statusMeta(props.review.status).color)
const ringDeg = computed(() => score.value != null ? Math.round((score.value / max.value) * 360) : 0)
const stepIdx = computed(() => Math.max(1, STATUS_ORDER.indexOf(props.review.status) + 1))
const isLive = computed(() => ['SELF_ASSESSMENT', 'MANAGER_ASSESSMENT'].includes(props.review.status))
const needsAck = computed(() => props.review.status === 'COMPLETED')

const bandLabel = computed(() => props.review.final_rating_band || null)
const bandColor = computed(() => bandTone(props.review.final_rating_band))
const scoreWord = computed(() => {
  if (score.value == null) return ''
  const f = score.value / max.value
  if (f >= 0.9) return 'Exceptional'
  if (f >= 0.7) return 'Exceeds'
  if (f >= 0.5) return 'Meets'
  if (f >= 0.3) return 'Partial'
  return 'Below'
})

const hike = computed(() => (props.review.hike_status && props.review.hike_status !== 'NONE') ? hikeStatusMeta(props.review.hike_status) : null)
const hikeLabel = computed(() => {
  const s = props.review.hike_status
  // mirror the disclosure policy: only show the exact % once APPLIED
  if (s === 'APPLIED' && props.review.approved_hike_pct != null) return `+${props.review.approved_hike_pct}%`
  if (['RECOMMENDED', 'APPROVED'].includes(s)) return 'With HR'
  return hike.value?.label || ''
})

const nodeClass = (i) => {
  const cur = STATUS_ORDER.indexOf(props.review.status)
  if (props.review.status === 'CANCELLED') return 'cancel'
  if (i < cur) return 'done'
  if (i === cur) return 'active'
  return ''
}
const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
</script>

<style scoped>
.src-shell { animation: perf-deal 0.5s var(--perf-spring) both; animation-delay: calc(var(--i) * 0.05s); }
.src { position: relative; overflow: hidden; cursor: pointer; padding: 14px 15px; border-radius: 16px; display: flex; flex-direction: column; gap: 11px;
  background: var(--perf-surface); border: 1px solid var(--perf-border); box-shadow: var(--perf-card-shadow);
  transition: transform 0.28s var(--perf-spring), border-color 0.28s, box-shadow 0.28s; --mx: 0.5; --my: 0.5; --spot: 0; }
.src:hover { transform: perspective(1100px) rotateX(calc((var(--my) - 0.5) * -5deg)) rotateY(calc((var(--mx) - 0.5) * 8deg)) translateY(-3px);
  border-color: var(--perf-border-warm); box-shadow: var(--perf-card-shadow-hover); }
.src-glare { position: absolute; inset: 0; z-index: 2; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(360px circle at calc(var(--mx) * 100%) calc(var(--my) * 100%), color-mix(in srgb, var(--perf-gold) 16%, transparent), transparent 46%); }
.src-spine { position: absolute; left: 0; top: 13px; bottom: 13px; width: 3px; border-radius: 0 3px 3px 0; }
.src.live .src-spine::after { content: ''; position: absolute; inset: 0; border-radius: inherit; background: inherit; filter: blur(3px); animation: src-pulse 2.4s ease-in-out infinite; }
.src-flag { position: absolute; top: 11px; right: 11px; z-index: 3; display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%;
  color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 16%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 34%, transparent); animation: src-bell 2.6s ease-in-out infinite; }

.src-top { position: relative; z-index: 1; display: flex; align-items: center; gap: 12px; }
.src-gauge { position: relative; display: grid; place-items: center; width: 50px; height: 50px; border-radius: 50%; flex-shrink: 0;
  background: conic-gradient(var(--c) var(--perf-p, 0deg), var(--perf-track) 0); transition: --perf-p 0.9s var(--perf-spring);
  filter: drop-shadow(0 0 9px color-mix(in srgb, var(--c) 30%, transparent)); }
.src-gauge-in { position: absolute; inset: 4px; border-radius: 50%; background: var(--perf-surface); display: grid; place-items: center; }
.src-gauge-val { font-size: 15px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; }
.src-gauge-step { font-size: 11px; font-weight: 800; color: var(--perf-text-muted); font-variant-numeric: tabular-nums; }
.src-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.src-id b { font-size: 13.5px; font-weight: 800; color: var(--perf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.src-id span { font-size: 10.5px; color: var(--perf-text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.src-band-row { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 6px; }
.src-band { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 800; padding: 3px 9px; border-radius: 999px;
  color: var(--c); background: color-mix(in srgb, var(--c) 13%, transparent); border: 1px solid color-mix(in srgb, var(--c) 26%, transparent); }
.src-band.ghost { color: var(--perf-text-secondary); background: var(--perf-panel); border: 1px solid var(--perf-border); }

.src-pipe { position: relative; z-index: 1; display: flex; gap: 5px; }
.src-node { flex: 1; height: 4px; border-radius: 999px; background: var(--perf-track); transition: background 0.3s; }
.src-node.done { background: var(--perf-ok); }
.src-node.active { background: var(--perf-gold); box-shadow: 0 0 8px color-mix(in srgb, var(--perf-gold) 60%, transparent); }
.src-node.cancel { background: var(--perf-conflict); opacity: 0.4; }

.src-foot { position: relative; z-index: 1; display: flex; align-items: center; gap: 9px; padding-top: 10px; border-top: 1px solid var(--perf-border); }
.src-mgr { flex: 1; min-width: 0; display: inline-flex; align-items: center; gap: 8px; }
.src-mgr-av { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0; font-size: 10px; font-weight: 850; color: #1a1206; background: var(--perf-grad-hero); }
.src-mgr-txt { min-width: 0; display: flex; flex-direction: column; line-height: 1.25; }
.src-mgr-txt em { font-size: 8.5px; font-style: normal; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--perf-text-dim); }
.src-mgr-txt b { font-size: 11.5px; font-weight: 700; color: var(--perf-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.src-hike { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 999px;
  color: var(--hc); background: color-mix(in srgb, var(--hc) 12%, transparent); border: 1px solid color-mix(in srgb, var(--hc) 28%, transparent); }
.src-hike :deep(svg) { color: var(--hc); }

@keyframes src-pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
@keyframes src-bell { 0%, 86%, 100% { transform: rotate(0); } 90% { transform: rotate(-12deg); } 94% { transform: rotate(10deg); } }
@media (prefers-reduced-motion: reduce) {
  .src-shell { animation: none; }
  .src:hover { transform: translateY(-3px); }
  .src.live .src-spine::after, .src-flag { animation: none; }
  .src-gauge { transition: none; }
}
</style>
