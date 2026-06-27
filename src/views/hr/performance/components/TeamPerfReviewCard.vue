<template>
  <article ref="el" class="tprc" :class="{ pending: needsAction, dim: dimmed, lit, awaiting: !review, in: visible }"
    :style="{ '--c': accent, '--i': index }"
    @click="onClick" @mouseenter="$emit('hover', item.employee_id)" @mouseleave="$emit('hover', null)">
    <span class="tprc-glow" aria-hidden="true" />
    <span class="tprc-sheen" aria-hidden="true" />
    <span class="tprc-spine" aria-hidden="true" />

    <!-- header -->
    <header class="tprc-head">
      <span class="tprc-av">
        <span class="tprc-av-ring" aria-hidden="true" />
        {{ initials(item.employee_name) }}
      </span>
      <div class="tprc-id">
        <b>{{ item.employee_name }}</b>
        <span>{{ item.designation_name || '—' }}{{ item.department_name ? ' · ' + item.department_name : '' }}</span>
      </div>
      <span v-if="review" class="tprc-stat" :style="{ '--s': statusColor }">{{ statusLabel }}</span>
      <span v-else class="tprc-stat new"><Sparkles :size="10" /> New</span>
    </header>

    <!-- body: ring + meta -->
    <div class="tprc-body">
      <div class="tprc-ring-wrap">
        <svg class="tprc-ring" viewBox="0 0 52 52" aria-hidden="true">
          <circle class="tprc-ring-bg" cx="26" cy="26" r="22" />
          <circle class="tprc-ring-fg" cx="26" cy="26" r="22" :stroke="accent"
            :stroke-dasharray="CIRC" :stroke-dashoffset="visible ? ringOffset : CIRC" />
        </svg>
        <div class="tprc-ring-core">
          <b v-if="review && review.overall_score != null">{{ review.overall_score.toFixed(1) }}</b>
          <b v-else class="muted">—</b>
          <i>/{{ ratingMax }}</i>
        </div>
      </div>

      <div class="tprc-meta">
        <span class="tprc-period"><CalendarRange :size="12" /> {{ review ? (review.period_label || review.cycle) : 'Awaiting cycle' }}</span>
        <span class="tprc-tmpl">{{ review ? (review.template_name || 'Review') : 'No review opened yet' }}</span>
        <span v-if="bandLabel" class="tprc-chip band"><Coins :size="10" /> {{ bandLabel }}<template v-if="review.recommended_hike_pct != null"> · {{ review.recommended_hike_pct }}%</template></span>
        <span v-else-if="prior && prior.overall_score != null" class="tprc-chip prior">prev {{ prior.overall_score.toFixed(1) }}/{{ prior.rating_max }}</span>
      </div>
    </div>

    <!-- footer -->
    <footer class="tprc-foot">
      <span class="tprc-cue" :style="{ color: cue.color }"><component :is="cue.icon" :size="14" /> {{ cue.label }}</span>
      <span class="tprc-foot-r">
        <button class="tprc-360" type="button" title="View 360° feedback" @click.stop="fbOpen = true"><Orbit :size="13" /></button>
        <span v-if="hikePill" class="tprc-hike" :style="{ '--h': hikeMeta.color }"><component :is="hikeMeta.icon" :size="11" /> {{ hikeMeta.label }}</span>
        <span v-else class="tprc-go"><ArrowRight :size="15" /></span>
      </span>
    </footer>
  </article>

  <!-- manager's view of this report's 360° feedback (incl. their self-assessment) -->
  <TeamFeedbackModal :open="fbOpen" :employee="item" @close="fbOpen = false" />
</template>

<script setup>
import { ref, computed } from 'vue'
import { CalendarRange, PencilRuler, Coins, CheckCircle2, Eye, ArrowRight, Sparkles, Rocket, Orbit } from 'lucide-vue-next'
import { scoreTone, hikeStatusMeta, statusMeta } from '@/composables/usePerformance'
import { usePointerSpotlight, useInView } from '@/composables/useShiftMotion'
import TeamFeedbackModal from './TeamFeedbackModal.vue'

const props = defineProps({
  item: { type: Object, required: true },
  index: { type: Number, default: 0 },
  dimmed: { type: Boolean, default: false },
  lit: { type: Boolean, default: false },
})
const emit = defineEmits(['open', 'start', 'hover'])
const el = ref(null)
usePointerSpotlight(el)
const { visible } = useInView(el, { threshold: 0.18 })
const fbOpen = ref(false)

const CIRC = 2 * Math.PI * 22   // ≈ 138.23

const review = computed(() => props.item.review)
const prior = computed(() => props.item.latest)
const ratingMax = computed(() => review.value?.rating_max || 5)
const frac = computed(() => review.value?.overall_score != null ? Math.max(0, Math.min(1, review.value.overall_score / ratingMax.value)) : 0)
const ringOffset = computed(() => CIRC * (1 - frac.value))
const accent = computed(() => review.value?.overall_score != null ? scoreTone(review.value.overall_score, ratingMax.value) : 'var(--perf-unset)')
const hikeMeta = computed(() => hikeStatusMeta(review.value?.hike_status))
const hikePill = computed(() => review.value && review.value.hike_status && review.value.hike_status !== 'NONE')
const bandLabel = computed(() => review.value?.final_rating_band || null)
const statusLabel = computed(() => statusMeta(review.value?.status).label)
const statusColor = computed(() => statusMeta(review.value?.status).color)

const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'

const needsAction = computed(() => {
  const r = review.value
  if (!r) return true
  if (['SELF_ASSESSMENT', 'MANAGER_ASSESSMENT', 'DRAFT'].includes(r.status)) return true
  if (['COMPLETED', 'ACKNOWLEDGED'].includes(r.status) && (!r.hike_status || r.hike_status === 'NONE')) return true
  return false
})
const cue = computed(() => {
  const r = review.value
  if (!r) return { label: 'Open a review', color: 'var(--perf-gold)', icon: Rocket }
  if (['SELF_ASSESSMENT', 'MANAGER_ASSESSMENT', 'DRAFT'].includes(r.status)) return { label: 'Score this review', color: 'var(--perf-orange)', icon: PencilRuler }
  if (['COMPLETED', 'ACKNOWLEDGED'].includes(r.status) && (!r.hike_status || r.hike_status === 'NONE')) return { label: 'Recommend a hike', color: 'var(--perf-gold)', icon: Coins }
  if (r.hike_status === 'APPLIED') return { label: 'Increment applied', color: 'var(--perf-ok)', icon: CheckCircle2 }
  return { label: 'View review', color: 'var(--perf-text-muted)', icon: Eye }
})
const onClick = () => { if (review.value) emit('open', review.value); else emit('start', props.item) }
</script>

<style scoped>
.tprc {
  position: relative; overflow: hidden; min-height: 186px;
  display: flex; flex-direction: column; gap: 14px; padding: 16px 17px; border-radius: 18px; cursor: pointer;
  --mx: 0.5; --my: 0.5; --spot: 0;
  background:
    linear-gradient(160deg, color-mix(in srgb, var(--c) 8%, transparent), transparent 42%),
    var(--perf-surface);
  border: 1px solid var(--perf-border);
  box-shadow: var(--perf-card-shadow);
  opacity: 0; transform: translateY(20px) scale(0.985);
  transform-style: preserve-3d;
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s, border-color 0.22s, opacity 0.2s, filter 0.22s;
}
.tprc.in { animation: tprc-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: calc(var(--i, 0) * 0.05s); }
.tprc:hover {
  transform: perspective(1100px)
    rotateX(calc((var(--my) - 0.5) * -6deg))
    rotateY(calc((var(--mx) - 0.5) * 9deg))
    translateY(-5px);
  border-color: color-mix(in srgb, var(--c) 45%, var(--perf-border)); box-shadow: var(--perf-card-shadow-hover);
}
.tprc.pending { border-left: 3px solid var(--c); }
.tprc.awaiting { border-style: dashed; }
.tprc.dim { filter: saturate(0.55); opacity: 0.5 !important; }
.tprc.lit { border-color: var(--c); box-shadow: 0 0 0 1px var(--c), var(--perf-card-shadow-hover); }

.tprc-glow { position: absolute; inset: 0; z-index: 2; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(440px circle at calc(var(--mx, 0.5) * 100%) calc(var(--my, 0.5) * 100%), color-mix(in srgb, var(--c) 24%, transparent), transparent 46%); }
/* diagonal sheen that sweeps across on hover */
.tprc-sheen { position: absolute; top: 0; left: 0; width: 60%; height: 100%; z-index: 2; pointer-events: none; opacity: 0;
  background: linear-gradient(105deg, transparent, color-mix(in srgb, #fff 22%, transparent), transparent);
  transform: translateX(-160%) skewX(-14deg); transition: opacity 0.2s; }
.tprc:hover .tprc-sheen { opacity: 1; animation: tprc-sweep 0.9s var(--perf-ease, cubic-bezier(0.22,1,0.36,1)); }
.tprc-spine { position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px; border-radius: 3px; background: linear-gradient(var(--c), transparent); opacity: 0; transition: opacity 0.25s; }
.tprc.pending .tprc-spine { opacity: 0.85; }
.tprc.pending .tprc-spine::after { content: ''; position: absolute; inset: 0; border-radius: inherit; background: inherit; filter: blur(4px); animation: tprc-spinepulse 2.2s ease-in-out infinite; }

.tprc-head { display: flex; align-items: center; gap: 11px; position: relative; z-index: 1; }
.tprc-av { position: relative; display: grid; place-items: center; width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0;
  font-size: 13px; font-weight: 850; color: #1a1206; background: var(--perf-grad-hero); }
.tprc-av-ring { position: absolute; inset: -3px; border-radius: 50%; border: 1.5px solid color-mix(in srgb, var(--c) 55%, transparent); }
.tprc-id { flex: 1; min-width: 0; }
.tprc-id b { display: block; font-size: 14px; font-weight: 850; color: var(--perf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tprc-id span { display: block; font-size: 10.5px; color: var(--perf-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tprc-stat { flex-shrink: 0; font-size: 9.5px; font-weight: 800; letter-spacing: 0.03em; text-transform: uppercase; padding: 4px 9px; border-radius: 999px;
  color: var(--s, var(--perf-gold)); background: color-mix(in srgb, var(--s, var(--perf-gold)) 13%, transparent); border: 1px solid color-mix(in srgb, var(--s, var(--perf-gold)) 26%, transparent); }
.tprc-stat.new { display: inline-flex; align-items: center; gap: 4px; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 13%, transparent); border-color: color-mix(in srgb, var(--perf-gold) 26%, transparent); }

.tprc-body { display: flex; align-items: center; gap: 15px; position: relative; z-index: 1; flex: 1; }
.tprc-ring-wrap { position: relative; width: 62px; height: 62px; flex-shrink: 0; }
.tprc-ring { width: 100%; height: 100%; transform: rotate(-90deg); }
.tprc-ring-bg { fill: none; stroke: var(--perf-track); stroke-width: 5; }
.tprc-ring-fg { fill: none; stroke-width: 5; stroke-linecap: round; transition: stroke-dashoffset 0.9s cubic-bezier(0.16, 1, 0.3, 1); filter: drop-shadow(0 0 4px color-mix(in srgb, var(--c) 45%, transparent)); }
.tprc-ring-core { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.tprc-ring-core b { font-size: 17px; font-weight: 850; color: var(--perf-text); line-height: 1; font-variant-numeric: tabular-nums; }
.tprc-ring-core b.muted { color: var(--perf-text-dim); }
.tprc-ring-core i { font-size: 8.5px; font-style: normal; color: var(--perf-text-muted); margin-top: 1px; }

.tprc-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.tprc-period { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 750; color: var(--perf-text-secondary); }
.tprc-period :deep(svg) { color: var(--perf-text-dim); flex-shrink: 0; }
.tprc-tmpl { font-size: 10.5px; color: var(--perf-text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tprc-chip { display: inline-flex; align-items: center; gap: 4px; align-self: flex-start; margin-top: 2px; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 999px; }
.tprc-chip.band { color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 13%, transparent); }
.tprc-chip.prior { color: var(--perf-text-muted); background: var(--perf-track); font-weight: 700; }

.tprc-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-top: 12px; border-top: 1px solid var(--perf-border); position: relative; z-index: 1; }
.tprc-foot-r { display: inline-flex; align-items: center; gap: 7px; flex-shrink: 0; }
.tprc-cue { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 800; min-width: 0; }
.tprc-360 { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; cursor: pointer; flex-shrink: 0; color: var(--perf-orange);
  background: color-mix(in srgb, var(--perf-orange) 12%, transparent); border: 1px solid color-mix(in srgb, var(--perf-orange) 26%, transparent); transition: all 0.2s; }
.tprc-360:hover { color: #1a1206; background: var(--perf-orange); border-color: transparent; transform: translateY(-1px); }
.tprc-hike { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.02em; text-transform: uppercase; padding: 3px 9px; border-radius: 999px;
  color: var(--h); background: color-mix(in srgb, var(--h) 13%, transparent); }
.tprc-go { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; color: var(--perf-text-dim); background: var(--perf-track); transition: all 0.22s; }
.tprc:hover .tprc-go { color: #1a1206; background: var(--perf-grad-hero); transform: translateX(2px); }

@keyframes tprc-in { to { opacity: 1; transform: none; } }
@keyframes tprc-sweep { from { transform: translateX(-160%) skewX(-14deg); } to { transform: translateX(260%) skewX(-14deg); } }
@keyframes tprc-spinepulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.9; } }
@media (prefers-reduced-motion: reduce) {
  .tprc { animation: none; opacity: 1; transform: none; }
  .tprc:hover { transform: translateY(-4px); }
  .tprc-sheen { display: none; }
  .tprc.pending .tprc-spine::after { animation: none; }
  .tprc-ring-fg { transition: none; }
}
</style>
